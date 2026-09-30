#!/usr/bin/env perl
use strict;
use warnings;
use Cwd qw(abs_path);
use File::Temp qw(tempdir);
use File::Path qw(make_path);
use File::Copy qw(copy);
use Digest::SHA qw(sha256_hex);
use JSON::PP;
my $root=abs_path('.');
my $tmp=tempdir('repo-regression-XXXXXX',TMPDIR=>1,CLEANUP=>1);
sub put { my ($p,$s)=@_; open my $f,'>:raw',$p or die $!; print $f $s; close $f; }
sub get { open my $f,'<:raw',$_[0] or die $!; local $/; return <$f>; }
sub command { my ($ok,@cmd)=@_; print '+ ',join(' ',@cmd),"\n"; my $rc=system(@cmd); die "Unexpected status $rc\n" if ($rc==0)!=$ok; }
make_path("$tmp/scripts","$tmp/debs");
for my $p (qw(up.sh repo.conf package-history.json index.html CydiaIcon.png scripts/repo.pl),glob('debs/*.deb')) { copy($p,"$tmp/$p") or die $!; }
chdir $tmp or die $!;
local $ENV{SOURCE_DATE_EPOCH}=1790700000;
command(1,'sh','up.sh','build');
my %snapshot=map { $_=>sha256_hex(get($_)) } (glob('Packages*'),'Release',glob('depictions/*'),'packages.html');
command(1,'sh','up.sh','build');
for (keys %snapshot) { die "Non-reproducible $_\n" unless sha256_hex(get($_)) eq $snapshot{$_}; }
print "PASS: deterministic complete build with SOURCE_DATE_EPOCH\n";
for my $p (glob('depictions/*.json')) { my $j=JSON::PP->new->utf8->decode(get($p)); die "Bad Sileo schema\n" unless $j->{class} eq 'DepictionTabView' && $j->{minVersion} eq '0.4' && @{$j->{tabs}}; }
my ($deb)=glob('debs/*.deb');
copy($deb,'debs/duplicate.deb') or die $!;
command(0,'sh','up.sh','build'); unlink 'debs/duplicate.deb' or die $!;
die "Failed build changed Packages\n" unless sha256_hex(get('Packages')) eq $snapshot{Packages};
copy($deb,'input with spaces; harmless.deb') or die $!;
command(1,'sh','up.sh','import',"$tmp/input with spaces; harmless.deb");
symlink "$tmp/$deb","$tmp/symlink.deb" or die $!;
command(0,'sh','up.sh','import',"$tmp/symlink.deb");
put('bad.deb','not an archive'); command(0,'sh','up.sh','import',"$tmp/bad.deb");
put('debs/unsafe name.deb','bad'); command(0,'sh','up.sh','build'); unlink 'debs/unsafe name.deb' or die $!;
# Synthetic packages never leave the temporary directory; their scripts never run.
make_path('fixture/DEBIAN');
my $control="Package: test.repo\nVersion: 1.0\nArchitecture: iphoneos-arm64\nMaintainer: Repo Test <test\@example.invalid>\nDescription: Import fixture\n";
put('fixture/DEBIAN/control',$control); put('fixture/payload','first');
command(1,'dpkg-deb','--build','fixture','new package.deb');
command(1,'sh','up.sh','import',"$tmp/new package.deb");
die "Missing canonical import\n" unless -f 'debs/test.repo_1.0_iphoneos-arm64.deb';
put('fixture/payload','different bytes'); command(1,'dpkg-deb','--build','fixture','conflict.deb');
command(0,'sh','up.sh','import',"$tmp/conflict.deb");
unlink 'debs/test.repo_1.0_iphoneos-arm64.deb' or die $!;
$control =~ s/iphoneos-arm64/amd64/; put('fixture/DEBIAN/control',$control);
command(1,'dpkg-deb','--build','fixture','wrong-arch.deb'); command(0,'sh','up.sh','import',"$tmp/wrong-arch.deb");
for my $p ('Packages.gz','Release','depictions/ai.akemi.appsyncunified_116.0_iphoneos-arm.html') {
    my $original=get($p); put($p,$original."corruption\n"); command(0,'sh','up.sh','check'); put($p,$original);
}
put('depictions/stale.html','stale'); command(0,'sh','up.sh','build'); unlink 'depictions/stale.html' or die $!;
put('InRelease','test signature guard'); command(0,'sh','up.sh','build'); unlink 'InRelease' or die $!;
command(1,'sh','up.sh','check');
for (keys %snapshot) { die "Negative tests changed $_\n" unless sha256_hex(get($_)) eq $snapshot{$_}; }
print "PASS: duplicate identities, safe spaced input, idempotent imports, symlinks, invalid archives, unsafe stored names, new imports, conflicting identities, unknown architectures, corrupted compression/Release/depictions, stale files, signature guard\n";
chdir $root or die $!;
