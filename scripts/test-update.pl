#!/usr/bin/env perl
use strict; use warnings;
use Cwd qw(abs_path);
use File::Temp qw(tempdir);
use File::Path qw(make_path);
use File::Copy qw(copy);
use File::Find;
my $root=abs_path('.');
my ($perl)=grep {-x $_} map {"$_/perl"} split /:/,$ENV{PATH};
$perl=abs_path($perl // die 'perl unavailable');
my $tmp=tempdir('repo-update-XXXXXX',TMPDIR=>1,CLEANUP=>1);
make_path("$tmp/work");
find({no_chdir=>1,wanted=>sub {
    my $rel=substr($File::Find::name,length($root)+1);
    if ($rel eq '.git') { $File::Find::prune=1; return; }
    return if !$rel || $rel eq '.repo.lock';
    if (-d $_) { make_path("$tmp/work/$rel"); }
    elsif (-f $_) { copy($_,"$tmp/work/$rel") or die $!; chmod((stat($_))[2]&0777,"$tmp/work/$rel") or die $!; }
}},$root);
chdir "$tmp/work" or die $!;
sub put { open my $f,'>',$_[0] or die $!; print $f $_[1]; close $f or die $!; }
sub capture { open my $f,'-|',@_ or die $!; local $/; my $s=<$f>; close $f or die "Command failed: @_\n"; return $s//''; }
sub run { my ($ok,@cmd)=@_; print '+ ',join(' ',@cmd),"\n"; my $rc=system(@cmd); die "Unexpected status $rc: @cmd\n" if ($rc==0)!=$ok; }
# Fix the existing supported rebuild timestamp to exercise a truly unchanged tree.
local $ENV{SOURCE_DATE_EPOCH}=1790700000;
run(1,'sh','-n','up.sh');
run(1,'./up.sh','list'); run(1,'./up.sh','rebuild'); run(1,'./up.sh','check');
run(1,'git','init','-b','main');
run(1,'git','config','user.name','Repository Test');
run(1,'git','config','user.email','repo-test@example.invalid');
put('modified.txt',"before\n"); put('deleted.txt',"before\n");
run(1,'git','add','-A'); run(1,'git','commit','-m','Baseline');
run(1,'git','init','--bare',"$tmp/origin.git");
run(1,'git','remote','add','origin',"$tmp/origin.git");
run(1,'git','push','origin','main');
put('added.txt',"added\n"); put('modified.txt',"after\n"); unlink 'deleted.txt' or die $!;
# Root candidates use the real package-management path; duplicate bytes are removed safely.
my ($deb)=glob('debs/*.deb'); copy($deb,'candidate.deb') or die $!;
run(1,'./up.sh'); die 'candidate not processed' if -e 'candidate.deb';
die 'wrong commit message' unless capture('git','log','-1','--format=%s') eq "Update repository\n";
die 'staging omitted additions/modifications/deletions' unless capture('git','diff','--name-status','HEAD^','HEAD') eq "A\tadded.txt\nD\tdeleted.txt\nM\tmodified.txt\n";
die 'remote not updated' unless capture('git','rev-parse','HEAD') eq capture('git',"--git-dir=$tmp/origin.git",'rev-parse','main');
my $head=capture('git','rev-parse','HEAD');
delete $ENV{SOURCE_DATE_EPOCH};
my $out=capture('./up.sh'); print $out;
die 'no-change message/empty commit' unless $out =~ /^Repository is already up to date\.$/m && capture('git','rev-parse','HEAD') eq $head;
sub unchanged { die 'failure changed HEAD or staging' unless capture('git','rev-parse','HEAD') eq $head && capture('git','diff','--cached','--name-only') eq ''; }
put('unrelated.txt',"preserve me\n"); put('invalid.deb','invalid');
run(0,'./up.sh'); unchanged(); unlink 'invalid.deb' or die $!;
# Inject only the standalone check failure after the real auto rebuild/validation.
make_path("$tmp/bin");
put("$tmp/bin/perl",qq{#!/bin/sh\nif [ "\$2" = check ]; then echo 'Injected local check failure' >&2; exit 23; fi\nexec "$perl" "\$@"\n});
chmod 0755,"$tmp/bin/perl" or die $!;
{ local $ENV{PATH}="$tmp/bin:$ENV{PATH}"; run(0,'./up.sh'); }
unchanged(); die 'unrelated change discarded' unless -f 'unrelated.txt';
put("$tmp/origin.git/hooks/pre-receive","#!/bin/sh\necho 'Injected push rejection' >&2\nexit 1\n");
chmod 0755,"$tmp/origin.git/hooks/pre-receive" or die $!;
run(0,'./up.sh');
die 'push failure test did not commit' if capture('git','rev-parse','HEAD') eq $head;
die 'rejected push updated remote' unless capture('git',"--git-dir=$tmp/origin.git",'rev-parse','main') eq $head;
print "PASS: syntax, list/check/rebuild, automatic package processing/commit/push, no changes, complete staging, rebuild/check failures before staging, push rejection, preserved user changes\n";
chdir $root or die $!;
