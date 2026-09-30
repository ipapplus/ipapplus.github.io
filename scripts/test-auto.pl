#!/usr/bin/env perl
use strict; use warnings;
use File::Temp qw(tempdir); use File::Path qw(make_path); use File::Copy qw(copy);
use Digest::SHA qw(sha256_hex); use Cwd qw(abs_path); use Fcntl qw(:flock);
my $root=abs_path('.'); my $tmp=tempdir('repo-auto-XXXXXX',TMPDIR=>1,CLEANUP=>1);
sub put { open my $f,'>:raw',$_[0] or die $!; print $f $_[1]; close $f or die $!; }
sub bytes { open my $f,'<:raw',$_[0] or die $!; local $/; <$f> }
sub run { my ($ok,@cmd)=@_; print '+ ',join(' ',@cmd),"\n"; my $rc=system(@cmd); die "Unexpected status $rc\n" if ($rc==0)!=$ok; }
make_path("$tmp/scripts","$tmp/debs");
for my $p (qw(up.sh repo.conf package-history.json index.html CydiaIcon.png scripts/repo.pl scripts/test-apt.pl),glob('debs/*.deb')) { copy($p,"$tmp/$p") or die $!; }
chdir $tmp or die $!;
my ($deb)=glob('debs/*.deb'); my $hash=sha256_hex(bytes($deb));
my $input='-spaces ; $(touch EXPLOITED) &.deb'; copy($deb,$input) or die $!;
run(1,'sh','up.sh','auto'); die 'duplicate cleanup/hash' if -e $input || -e 'EXPLOITED' || sha256_hex(bytes($deb)) ne $hash;
run(1,'sh','up.sh','auto');
make_path('fixture/DEBIAN');
my $control="Package: test.auto\nVersion: 1.0\nArchitecture: iphoneos-arm64\nMaintainer: Test\nDescription: Test\n";
put('fixture/DEBIAN/control',$control); put('fixture/data','first'); run(1,'dpkg-deb','--build','fixture','valid.deb');
my $original=sha256_hex(bytes('valid.deb')); put('invalid.deb','invalid');
run(0,'sh','up.sh','auto'); die 'failed batch consumed source' unless -f 'valid.deb' && -f 'invalid.deb' && !-e 'debs/test.auto_1.0_iphoneos-arm64.deb'; unlink 'invalid.deb' or die $!;
# Simulate an interruption after destination publication but before source cleanup.
copy('valid.deb','debs/test.auto_1.0_iphoneos-arm64.deb') or die $!;
run(1,'sh','up.sh','auto'); die 'resume/hash' if -e 'valid.deb' || sha256_hex(bytes('debs/test.auto_1.0_iphoneos-arm64.deb')) ne $original;
put('fixture/data','conflict'); run(1,'dpkg-deb','--build','fixture','conflict.deb'); run(0,'sh','up.sh','auto'); die 'conflict removed' unless -f 'conflict.deb'; unlink 'conflict.deb' or die $!;
$control =~ s/iphoneos-arm64/amd64/; put('fixture/DEBIAN/control',$control); run(1,'dpkg-deb','--build','fixture','unsupported.deb'); run(0,'sh','up.sh','auto'); die 'unsupported removed' unless -f 'unsupported.deb'; unlink 'unsupported.deb' or die $!;
symlink $deb,'symlink.deb' or die $!; run(0,'sh','up.sh','auto'); unlink 'symlink.deb' or die $!;
open my $lock,'>>','.repo.lock' or die $!; flock($lock,LOCK_EX|LOCK_NB) or die $!; run(0,'sh','up.sh','auto'); close $lock;
local $ENV{REPO_SIGNING_KEY}='0000000000000000000000000000000000000000';
my $release=bytes('Release'); run(0,'sh','up.sh','build'); die 'signing failure changed Release' unless bytes('Release') eq $release;
print "PASS: automatic duplicate/empty runs, shell filenames, batch rejection, interruption recovery, conflicts, unsupported architecture, symlinks, locking, signing failure\n";
chdir $root or die $!;
