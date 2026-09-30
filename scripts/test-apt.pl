#!/usr/bin/env perl
use strict;
use warnings;
use Cwd qw(abs_path);
use File::Temp qw(tempdir);
use File::Path qw(make_path);
use Digest::SHA qw(sha256_hex);
my $root=abs_path('.');
my $tmp=tempdir('repo-apt-XXXXXX',TMPDIR=>1,CLEANUP=>1);
sub put { my ($p,$s)=@_; open my $f,'>',$p or die $!; print $f $s; close $f; }
sub run { print '+ ',join(' ',@_),"\n"; system(@_)==0 or die "Command failed: $?\n"; }
make_path("$tmp/lists/partial","$tmp/cache/archives/partial","$tmp/etc/empty");
put("$tmp/status",'');
# Unsigned permission applies only to this disposable test; no system APT files are changed.
put("$tmp/etc/sources.list","deb [trusted=yes] file:$root ./\n");
put("$tmp/apt.conf",qq{Dir::Etc::main "-";
Dir::Etc::parts "$tmp/etc/empty";
Dir::Etc::sourcelist "$tmp/etc/sources.list";
Dir::Etc::sourceparts "$tmp/etc/empty";
Dir::State "$tmp";
Dir::State::status "$tmp/status";
Dir::State::lists "$tmp/lists";
Dir::Cache "$tmp/cache";
Dir::Cache::pkgcache "$tmp/cache/pkgcache.bin";
Dir::Cache::srcpkgcache "$tmp/cache/srcpkgcache.bin";
Dir::Log "$tmp";
APT::Sandbox::User "}.getpwuid($<).qq{";
Acquire::Languages "none";
Acquire::Retries "0";
#clear APT::Update::Pre-Invoke;
#clear APT::Update::Post-Invoke;
#clear APT::Update::Post-Invoke-Success;
});
local $ENV{APT_CONFIG}="$tmp/apt.conf";
open my $index,'<',"$root/Packages" or die $!; my $data=do { local $/; <$index> }; close $index;
my @packages=map { my %f=/^([A-Za-z0-9-]+): (.*)$/mg; \%f } grep {/\S/} split /\n\n/,$data;
my %arches=map { $_->{Architecture}=>1 } @packages;
if (!@packages) {
    open my $release,'<',"$root/Release" or die $!;
    while (<$release>) { if (/^Architectures: (.+)/) { $arches{$_}=1 for split /\s+/,$1; } }
    close $release;
    die "Empty repository has no configured targets\n" unless keys %arches;
}
for my $arch (sort keys %arches) {
    my @opts=('-o',"APT::Architecture=$arch",'-o',"APT::Architectures::=$arch");
    run('apt-get',@opts,'update');
    for my $p (grep { $_->{Architecture} eq $arch } @packages) {
    run('apt-cache',@opts,'policy',"$p->{Package}:$arch");
    chdir $tmp or die $!;
    run('apt-get',@opts,'download',"$p->{Package}:$arch=$p->{Version}");
    my ($name)=glob('*.deb'); die "No download\n" unless defined $name;
    for my $path ($name,"$root/$p->{Filename}") { die "Missing $path\n" unless -f $path; }
    sub bytes { open my $f,'<:raw',$_[0] or die $!; local $/; return <$f>; }
    die "Wrong downloaded bytes for $arch\n" unless sha256_hex(bytes($name)) eq sha256_hex(bytes("$root/$p->{Filename}"));
    unlink $name or die $!;
    chdir $root or die $!;
    print "PASS: APT selected and downloaded exact $arch archive $p->{Package}\n";
    }
}
print @packages ? "PASS: isolated APT update/policy/download for all indexed architectures; no installation performed\n" : "PASS: empty repository APT update for all configured architectures; no downloads or installation\n";
