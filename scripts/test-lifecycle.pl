#!/usr/bin/env perl
use strict; use warnings;
use File::Temp qw(tempdir); use File::Path qw(make_path remove_tree); use File::Copy qw(copy);
use File::Find; use File::Basename qw(basename); use Cwd qw(abs_path); use Digest::SHA qw(sha256_hex); use JSON::PP;
my $root=abs_path('.'); my $tmp=tempdir('repo-lifecycle-XXXXXX',TMPDIR=>1,CLEANUP=>1);
sub get { open my $f,'<:raw',$_[0] or die "$_[0]: $!"; local $/; return <$f>//''; }
sub put { make_path(File::Basename::dirname($_[0])); open my $f,'>:raw',$_[0] or die $!; print $f $_[1]; close $f or die $!; }
sub run {
    # These Git-free fixtures exercise package management, not publication.
    push @_, 'auto' if @_ == 2;
    my ($ok,$answer,@args)=@_; print '+ sh up.sh ',join(' ',@args),"\n";
    local $SIG{PIPE}='IGNORE'; open my $pipe,'|-','sh','up.sh',@args or die $!;
    print $pipe $answer if defined $answer;
    my $success=close $pipe; die "Unexpected command status: $?\n" if !!$success != !!$ok;
}
sub snap {
    my %s; find(sub {return unless -f && $File::Find::name !~ m{^\./fixture/}; $s{$File::Find::name}=sha256_hex(get($_)).':'.(stat($_))[9]},'.');
    return JSON::PP->new->canonical->encode(\%s);
}
sub unchanged { die "Repository changed unexpectedly\n" unless snap() eq $_[0]; }
sub generated { return (qw(Packages Packages.gz Packages.bz2 Packages.xz Release packages.html provenance.json generated-files.json),glob('depictions/*')); }
sub assert_hashes { my $hashes=shift; for my $p (keys %$hashes) {die "Archive bytes changed: $p\n" unless -f $p && sha256_hex(get($p)) eq $hashes->{$p}} }
make_path("$tmp/scripts","$tmp/debs");
for my $p (qw(up.sh repo.conf package-history.json index.html CydiaIcon.png LICENSE SECURITY.md scripts/repo.pl scripts/test-apt.pl)) {copy($p,"$tmp/$p") or die $!}
# Accept either normal production state or the user's pre-recovery root inputs.
for my $p (glob('debs/*.deb'),glob('*.deb')) {copy($p,"$tmp/debs/".basename($p)) or die $!}
chdir $tmp or die $!;
local $ENV{REPO_PORTABLE_TESTS}=1; local $ENV{SOURCE_DATE_EPOCH}=1790700000;
run(1,undef,'rebuild');
my %hashes=map {$_=>sha256_hex(get($_))} glob('debs/*.deb');
my $history=get('package-history.json');
# Exact reported recovery: empty managed store, deleted indexes, archives in root.
unlink $_ or die $! for qw(Packages Packages.gz Packages.bz2 Packages.xz);
for my $p (keys %hashes) {rename $p,basename($p) or die $!}
die 'debs not empty' if glob('debs/*.deb');
run(1,undef); assert_hashes(\%hashes); die 'root sources survived successful recovery' if glob('*.deb');
run(1,undef,'check'); my $stable=snap(); run(1,undef); unchanged($stable);
die 'recovery reset history' unless get('package-history.json') eq $history;
print "PASS: exact empty-debs/root-archive/missing-index recovery and repeated automatic run\n";
# Delete ALL generated outputs, then recover without generated inputs.
unlink $_ or die $! for generated(); run(1,undef,'rebuild'); run(1,undef,'check');
$stable=snap(); run(1,undef,'rebuild'); unchanged($stable); assert_hashes(\%hashes);
# Strict read-only even when no runtime lock file exists.
unlink '.repo.lock' or die $!; $stable=snap(); run(1,undef,'check'); run(1,undef,'list'); unchanged($stable);
put('Packages.gz','corrupt'); $stable=snap(); run(0,undef,'check'); unchanged($stable); run(1,undef,'rebuild');
print "PASS: complete regeneration, repeatability, read-only check/list, corrupt-index recovery\n";
# Cancellation and invalid filter are byte/mtime no-ops.
$stable=snap(); run(1,"\n",'remove','ai.akemi.appsyncunified'); unchanged($stable);
run(1,"n\n",'remove','ai.akemi.appsyncunified'); unchanged($stable);
run(0,"y\n",'remove','ai.akemi.appsyncunified','--arch','amd64'); unchanged($stable);
# Staging failure must preserve archives, history and outputs.
{
    local $ENV{REPO_SIGNING_KEY}='0000000000000000000000000000000000000000';
    run(0,"y\n",'remove','ai.akemi.appsyncunified'); unchanged($stable);
}
# Fail after replacements begin: PATH wrapper sabotages only live verification.
# This exercises real rollback without a production fault-injection switch.
my $gzip; for (split /:/,$ENV{PATH}) {if (-x "$_/gzip") {$gzip="$_/gzip"; last}}
die 'gzip unavailable' unless $gzip;
make_path('fixture/bin');
put('fixture/bin/gzip',"#!/bin/sh\nif [ -d .repo-transaction ] && [ ! -f fixture/failed-once ]; then touch fixture/failed-once; exit 93; fi\nexec '$gzip' \"\$\@\"\n"); chmod 0755,'fixture/bin/gzip';
{local $ENV{PATH}="$tmp/fixture/bin:$ENV{PATH}"; run(0,"y\n",'remove','ai.akemi.appsyncunified'); unchanged($stable)}
run(1,undef,'check');
# An uncatchable interruption retains the journal; read-only commands must not repair it.
put('fixture/bin/gzip',"#!/bin/sh\nif [ -d .repo-transaction ]; then kill -KILL \"\$PPID\"; exit 94; fi\nexec '$gzip' \"\$\@\"\n"); chmod 0755,'fixture/bin/gzip';
{local $ENV{PATH}="$tmp/fixture/bin:$ENV{PATH}"; run(0,"y\n",'remove','ai.akemi.appsyncunified')}
die 'interruption lost recovery data' unless -f '.repo-transaction/journal.json';
my $interrupted=snap(); run(0,undef,'check'); run(0,undef,'list'); run(0,undef,'clean'); unchanged($interrupted);
run(1,undef,'rebuild'); unchanged($stable); run(1,undef,'check');
print "PASS: default-no/cancel/filter safety and staged/live-failure rollback\n";
# Single-architecture removal retains correct grouped card and surviving depictions.
run(1,"y\n",'remove','ai.akemi.appsyncunified','--arch','iphoneos-arm64');
die 'removed arch survives' if -e 'debs/ai.akemi.appsyncunified_116.0_iphoneos-arm64.deb';
for my $p (generated()) {die "stale arch reference in $p" if get($p) =~ /ai\.akemi\.appsyncunified_116\.0_iphoneos-arm64\.(?:deb|html|json)/}
for my $arch (qw(arm arm64e)) {my $p="debs/ai.akemi.appsyncunified_116.0_iphoneos-$arch.deb"; assert_hashes({$p=>$hashes{$p}})}
# Restore exact bytes through ordinary root workflow; preserve original chronology.
copy("$root/".(-f "$root/debs/ai.akemi.appsyncunified_116.0_iphoneos-arm64.deb" ? 'debs/' : '').'ai.akemi.appsyncunified_116.0_iphoneos-arm64.deb','restore.deb') or die $!;
run(1,undef); die 'restoration reset chronology' unless get('package-history.json') eq $history;
run(1,"y\n",'remove','ai.akemi.appsyncunified');
for my $p (generated()) {die "stale package reference in $p" if get($p) =~ /ai\.akemi\.appsyncunified/}
die 'package survives' if glob('debs/ai.akemi.appsyncunified*');
print "PASS: architecture-only removal, exact restoration, all-three-build removal and stale-reference cleanup\n";
# Multiple versions: explicit version and combined filters.
make_path('fixture/DEBIAN');
for my $pair (['1.0','iphoneos-arm'],['1.0','iphoneos-arm64'],['2.0','iphoneos-arm64e']) {
    put('fixture/DEBIAN/control',"Package: test.lifecycle\nVersion: $pair->[0]\nArchitecture: $pair->[1]\nMaintainer: Test\nDescription: Lifecycle fixture\n");
    system('dpkg-deb','--build','fixture','new.deb')==0 or die $!; run(1,undef);
}
my $h=JSON::PP->new->decode(get('package-history.json'));
run(1,"yes\n",'remove','test.lifecycle','--version','1.0','--arch','iphoneos-arm');
die 'combined filter removed wrong build' unless -f 'debs/test.lifecycle_1.0_iphoneos-arm64.deb' && -f 'debs/test.lifecycle_2.0_iphoneos-arm64e.deb';
run(1,"y\n",'remove','test.lifecycle','--version','1.0');
die 'version removal removed other version' unless -f 'debs/test.lifecycle_2.0_iphoneos-arm64e.deb';
my $h2=JSON::PP->new->decode(get('package-history.json')); die 'surviving chronology changed' unless $h->{packages}{'test.lifecycle/2.0'}{sequence}==$h2->{packages}{'test.lifecycle/2.0'}{sequence};
# Manual deletion uses the generated manifest to remove only owned stale depictions.
unlink 'debs/test.lifecycle_2.0_iphoneos-arm64e.deb' or die $!; run(1,undef,'rebuild');
for my $p (generated()) {die 'stale manually deleted package' if get($p) =~ /test\.lifecycle/}
put('depictions/custom.html','handwritten'); $stable=snap(); run(0,undef,'rebuild'); unchanged($stable); unlink 'depictions/custom.html' or die $!;
# Invalid and noncanonical managed files do not get silently renamed/deleted.
put('debs/invalid.deb','bad'); $stable=snap(); run(0,undef,'rebuild'); unchanged($stable); unlink 'debs/invalid.deb' or die $!;
my ($deb)=glob('debs/*.deb'); copy($deb,'debs/duplicate.deb') or die $!; $stable=snap(); run(0,undef,'rebuild'); unchanged($stable); unlink 'debs/duplicate.deb' or die $!;
rename $deb,'debs/manual.deb' or die $!; $stable=snap(); run(0,undef,'rebuild'); unchanged($stable); rename 'debs/manual.deb',$deb or die $!;
# A restored managed archive with missing history gets unknown date/sequence zero.
my $missing=JSON::PP->new->decode(get('package-history.json')); my ($key)=grep {!/^test\.|^ai\.akemi/} keys %{$missing->{packages}};
delete $missing->{packages}{$key}; put('package-history.json',JSON::PP->new->canonical->pretty->encode($missing));
run(1,undef,'rebuild'); my $restored=JSON::PP->new->decode(get('package-history.json'))->{packages}{$key}; die 'invented historical date' if defined $restored->{first_added} || $restored->{sequence}!=0;
print "PASS: version/combined filters, manual deletion, stale ownership, invalid/conflicting/noncanonical archives, unknown recovery chronology\n";
# Empty repository must have zero bytes in Packages and no stale generated entries.
my %remaining=map {$_->{package}=>1} @{JSON::PP->new->decode(get('provenance.json'))->{archives}};
for my $id (sort keys %remaining) {run(1,"y\n",'remove',$id)}
die 'not empty' if glob('debs/*.deb'); die 'Packages not empty' if length get('Packages');
die 'depictions survive' if glob('depictions/*');
die 'catalog not empty' unless get('packages.html') =~ /No packages are currently available/;
my $prov=JSON::PP->new->decode(get('provenance.json')); die 'provenance not empty' if @{$prov->{archives}};
run(1,undef,'check'); run(1,undef,'rebuild'); run(1,undef);
# Empty target APT update must still exercise configured architectures.
if (!$ENV{REPO_SKIP_DEVICE_EMPTY_TEST} && grep {-x "$_/apt-get"} split /:/,$ENV{PATH}) {system($^X,'scripts/test-apt.pl')==0 or die 'empty APT failure'}
# Clean only generator-marked disposable stages; never guess at user files.
make_path('.repo-stage-owned','.repo-stage-unknown'); put('.repo-stage-owned/.owner',"ipapplus disposable stage v1\n"); put('.repo-stage-owned/Packages','safe'); put('.repo-stage-unknown/keep','unknown');
put('keep.key','not a real key'); my $hist=get('package-history.json'); run(1,undef,'clean');
die 'unsafe clean' if -e '.repo-stage-owned' || !-f '.repo-stage-unknown/keep' || !-f 'keep.key' || get('package-history.json') ne $hist;
print "PASS: final-package removal, valid empty indexes/catalog/provenance, empty APT and conservative clean\n";
chdir $root or die $!;
