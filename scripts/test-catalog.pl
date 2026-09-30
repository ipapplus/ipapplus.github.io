#!/usr/bin/env perl
use strict; use warnings;
use File::Temp qw(tempdir); use File::Path qw(make_path); use File::Copy qw(copy);
use Digest::SHA qw(sha256_hex); use JSON::PP; use Cwd qw(abs_path);
my $root=abs_path('.'); my $tmp=tempdir('repo-catalog-XXXXXX',TMPDIR=>1,CLEANUP=>1);
sub get { open my $f,'<:raw',$_[0] or die $!; local $/; <$f> }
sub put { open my $f,'>:raw',$_[0] or die $!; print $f $_[1]; close $f or die $! }
sub run { system(@_)==0 or die "Command failed: @_\n" }
sub history { JSON::PP->new->decode(get('package-history.json'))->{packages} }
sub first_card { my ($card)=get('packages.html') =~ m{<article\b[^>]*>(.*?)</article>}s; return $card // die 'missing first card'; }
make_path("$tmp/scripts","$tmp/debs");
for my $p (qw(up.sh repo.conf package-history.json index.html CydiaIcon.png scripts/repo.pl scripts/test-apt.pl),glob('debs/*.deb')) { copy($p,"$tmp/$p") or die $! }
chdir $tmp or die $!;
# Reimport a real available archive as a new destination, retaining its known history.
my $real='debs/ai.akemi.appsyncunified_116.0_iphoneos-arm64e.deb';
my $hash=sha256_hex(get($real)); copy($real,'real input.deb') or die $!; unlink $real or die $!;
run('sh','up.sh','auto'); die 'real import hash/canonical path' unless sha256_hex(get($real)) eq $hash && !-e 'real input.deb';
my $html=get('packages.html'); my @cards=$html =~ m{(<article\b[^>]*>.*?</article>)}sg;
my $inventory=JSON::PP->new->utf8->decode(get('provenance.json'))->{archives};
my %groups;push @{$groups{$_->{package}.'/'.$_->{version}}},$_ for @$inventory;
die 'incorrect grouped card count' unless @cards==keys %groups;
my %labels=('iphoneos-arm'=>'Rootful','iphoneos-arm64'=>'Rootless','iphoneos-arm64e'=>'RootHide');
for my $key (keys %groups) {
    my @builds=@{$groups{$key}};my $id=$builds[0]{package};my $version=$builds[0]{version};
    my ($card)=grep {/data-search="[^\"]*\Q$id\E / && /<span class="version">\Q$version\E<\/span>/} @cards;
    die "missing card $key" unless $card;
    my @urls=$card =~ /href="(debs\/[^\"]+)"/g;
    die "incorrect build count $key" unless @urls==@builds;
    for my $build (@builds) {die "incorrect download $key" unless grep {$_ eq $build->{filename}} @urls;die 'target label missing' unless index($card,$labels{$build->{architecture}})>=0;}
    die 'single build needs direct Download link' if @builds==1 && $card !~ /class="download" href="debs\/[^\"]+" download [^>]*>Download<\/a>/;
    die 'multi build needs selector' if @builds>1 && $card !~ /data-selector aria-controls="builds-\d+"/;
    die 'single build has selector' if @builds==1 && $card =~ /data-selector/;
}
die 'old introduction remains' if $html =~ /Newest recorded additions first|Select the architecture used/;
die 'heading missing' unless $html =~ /<h1>LATEST ADDITIONS<\/h1>/;
my @dates=sort grep {defined $_} map {history()->{$_}{first_added}} keys %groups;
die 'incorrect update metadata' unless $html =~ /data-updated="\Q$dates[-1]\E"/;
die 'live search missing' unless $html =~ /addEventListener\('input',filter\)/ && $html =~ /id="no-results" hidden/;
my $original=get('package-history.json');
make_path('fixture/DEBIAN');
sub fixture {
    my ($pkg,$ver,$arch)=@_;
    put('fixture/DEBIAN/control',"Package: $pkg\nName: Catalog test\nVersion: $ver\nArchitecture: $arch\nMaintainer: Test\nDescription: Catalog regression\n");
    put('fixture/payload','test'); run('dpkg-deb','--build','fixture','new.deb'); run('sh','up.sh','auto');
}
fixture('zz.catalog','1.0','iphoneos-arm64');
my $first=history()->{'zz.catalog/1.0'}; die 'date missing' unless $first->{first_added};
die 'new addition not first' unless first_card() =~ /href="depictions\/zz.catalog_1.0/;
fixture('aa.catalog','1.0','iphoneos-arm64');
my $second=history()->{'aa.catalog/1.0'}; die 'non-increasing sequence' unless $second->{sequence}>$first->{sequence};
fixture('zz.catalog','1.0','iphoneos-arm');
die 'architecture bumped old version' unless first_card() =~ /href="depictions\/aa.catalog_1.0/;
die 'changed first import' unless history()->{'zz.catalog/1.0'}{sequence}==$first->{sequence} && history()->{'zz.catalog/1.0'}{first_added} eq $first->{first_added};
fixture('zz.catalog','2.0','iphoneos-arm64e');
die 'new version not first' unless first_card() =~ /href="depictions\/zz.catalog_2.0/;
my $stable=get('package-history.json'); run('sh','up.sh','auto'); run('sh','up.sh','check');
die 'rebuild changed chronology' unless get('package-history.json') eq $stable;
my $p=JSON::PP->new->utf8->decode(get('provenance.json'));
for (@{$p->{archives}}) { die 'incorrect provenance hash' unless $_->{sha256} eq sha256_hex(get($_->{filename})); die 'private filename' unless $_->{filename} =~ m{^debs/[^/]+\.deb$}; }
put('package-history.json','{}'); die 'invalid history accepted' if system('sh','up.sh','check')==0; put('package-history.json',$stable);
print "PASS: real archive import/hash, AppSync grouping and exact downloads, missing builds, newest-first imports, new version, architecture addition, stable history, provenance, invalid history\n";
chdir $root or die $!;
