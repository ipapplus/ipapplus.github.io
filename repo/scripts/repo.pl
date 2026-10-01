#!/usr/bin/env perl
use strict;
use warnings;
use Digest::SHA qw(sha256_hex sha512_hex sha1_hex);
use Digest::MD5 qw(md5_hex);
use JSON::PP;
use File::Temp qw(tempdir);
use File::Path qw(make_path);
use File::Find;
use File::Basename qw(dirname);
use Cwd qw(abs_path);
use POSIX qw(strftime);
use Encode ();

sub read_file { my ($p)=@_; open my $f,'<:raw',$p or die "$p: $!\n"; local $/; return <$f> // ''; }
sub write_file { my ($p,$s)=@_; make_path(dirname($p)); open my $f,'>:raw',$p or die "$p: $!\n"; print $f $s or die "$p: $!\n"; close $f or die "$p: $!\n"; }
sub capture { my @cmd=@_; open my $f,'-|',@cmd or die "Cannot run $cmd[0]: $!\n"; binmode $f; local $/; my $out=<$f>; close $f or die "Command failed (@cmd), status $?\n"; return $out // ''; }
sub fields {
    my ($text)=@_; my (%f,$key); $text =~ s/\r\n/\n/g;
    for (split /\n/,$text) {
        if (/^[ \t]/ && defined $key) { $f{$key}.="\n$_"; }
        elsif (/^([^:]+):[ \t]*(.*)$/) { ($key,my $value)=($1,$2); $f{$key}=$value; }
    }
    return \%f;
}
sub html { my $s=shift // ''; $s =~ s/&/&amp;/g; $s =~ s/</&lt;/g; $s =~ s/>/&gt;/g; $s =~ s/"/&quot;/g; $s =~ s/'/&#39;/g; return $s; }
sub json { JSON::PP->new->canonical->pretty->utf8->encode($_[0]); }
sub url_path { my $s=shift; $s =~ s{([^A-Za-z0-9_.~/+-])}{sprintf('%%%02X',ord($1))}ge; return $s; }
my %labels=('iphoneos-arm'=>'Rootful','iphoneos-arm64'=>'Rootless','iphoneos-arm64e'=>'RootHide','all'=>'All architectures');
my $root=abs_path(dirname(__FILE__).'/..');
chdir $root or die "$root: $!\n";
my $cfg=fields(read_file('repo.conf'));
my $base=delete $cfg->{URL};
die "repo.conf needs an HTTP(S) URL ending in /\n" unless defined $base && $base =~ m{\Ahttps?://[^\s]+/\z};
my $history=-f 'package-history.json' ? JSON::PP->new->utf8->decode(read_file('package-history.json')) : {schema=>1,packages=>{}};
sub group_key { join('/', @{$_[0]->{fields}}{qw(Package Version)}) }
sub stem { my $id=$_[0]->{id}; $id =~ s/:/_/g; return "depictions/$id"; }
sub downloads {
    my ($prefix,@builds)=@_;
    return '<div class="downloads">'.join('',map {
        my $short=$_->{fields}{Architecture}; $short =~ s/^iphoneos-//;
        '<a class="download" href="'.html($prefix.url_path($_->{path})).'">Download - '.html($short).'</a>'
    } @builds).'</div>';
}
sub metadata_url {
    my $url=shift;
    return html($url) unless $url =~ m{^https?://[^\s<>"\x00-\x1f]+$}i;
    return '<a rel="noreferrer" href="'.html($url).'">'.html($url).'</a>';
}
sub archive {
    my ($path)=@_;
    die "Archive is not a regular file: $path\n" unless -f $path && !-l $path;
    die "Unsafe archive path: $path\n" if $path =~ /[\x00-\x1f\x7f]/;
    my $f=eval { fields(capture('dpkg-deb','--field',"./$path")) };
    die "Invalid archive $path: $@" if $@;
    for my $key (qw(Package Version Architecture)) {
        die "Invalid $key in archive $path\n" unless defined $f->{$key} && $f->{$key} =~ /\A[A-Za-z0-9.+_:~-]+\z/;
    }
    my $data=read_file($path);
    return {fields=>$f,path=>$path,size=>length($data),id=>join('_',@$f{qw(Package Version Architecture)}),
        hashes=>{MD5sum=>md5_hex($data),SHA1=>sha1_hex($data),SHA256=>sha256_hex($data),SHA512=>sha512_hex($data)}};
}
sub page {
    my ($title,$body)=@_;
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'.html($title).'</title><style>body{font:16px/1.6 system-ui,sans-serif;background:#0a0d14;color:#e4e7ec;max-width:760px;margin:40px auto;padding:20px}a{color:#e7b987}article{background:#11151f;border:1px solid #30384a;border-radius:16px;padding:20px;margin:20px 0}dt{font-weight:bold}dd{margin:0 0 12px;overflow-wrap:anywhere}code{overflow-wrap:anywhere}a:focus-visible{outline:2px solid #e7b987}small{color:#c1c6d1}.downloads{display:flex;flex-wrap:wrap;gap:8px}.download{display:inline-block;padding:9px 12px;border:1px solid #5c4b3c;border-radius:9px;text-decoration:none;background:#191922;min-height:24px}.download:hover{background:#30271f}h1,h2,p{overflow-wrap:anywhere}h2{line-height:1.3}body{box-sizing:border-box}p{white-space:pre-line}@media(max-width:440px){body{margin:12px auto;padding:16px}article{padding:16px}}</style></head><body><main><h1>'.html($title).'</h1>'.$body.'</main></body></html>' . "\n";
}
sub catalog_page {
    my ($cards,$updated)=@_;
    my $body=<<'HTML';
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0a0d14"><title>Latest additions · ipapplus Repo</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#0a0d14;color:#e4e7ec;font:14px/1.4 system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}main{max-width:760px;margin:0 auto;padding:24px 14px;padding-bottom:calc(24px + env(safe-area-inset-bottom))}a{color:#d4a574}button,input{font:inherit}button,a{-webkit-tap-highlight-color:rgba(212,165,116,.15)}a:focus,button:focus,input:focus{outline:2px solid #d4a574;outline-offset:3px}[hidden]{display:none!important}.back{display:inline-block;min-height:44px;padding:10px 0;text-decoration:none}.heading{display:flex;align-items:center;justify-content:space-between;margin:10px 0 2px}h1{font-size:26px;line-height:1.1;letter-spacing:-.04em;margin:0 8px 0 0}.icon-button{flex-shrink:0;width:44px;height:44px;background:#11151f;color:#d4a574;border:1px solid #30384a;border-radius:10px;cursor:pointer}.icon-button svg{width:19px;height:19px;vertical-align:middle}.updated{display:block;color:#9aa3b7;font-size:12px;min-height:17px;margin-bottom:14px}.search{display:flex;margin:12px 0}.search input{min-width:0;flex:1;width:100%;height:44px;border:1px solid #30384a;border-radius:10px;background:#11151f;color:#e4e7ec;padding:10px;font-size:16px;-webkit-appearance:none}.search button{margin-left:8px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}article{position:relative;display:flex;align-items:center;background:#11151f;border:1px solid #262d3d;border-radius:12px;padding:10px 12px;margin:7px 0}.summary{flex:1;min-width:0;margin-right:10px}h2{font-size:15px;line-height:1.25;margin:0;overflow-wrap:break-word;word-wrap:break-word}h2 a{text-decoration:none;color:#e4e7ec}.version{color:#9aa3b7;font-size:11px;font-weight:400;margin-left:6px;word-break:break-all}.description{color:#c1c6d1;font-size:12px;line-height:1.35;margin:4px 0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.targets{color:#d4a574;font-size:10px;margin:0}.action{flex-shrink:0}.download{display:inline-block;text-align:center;text-decoration:none;min-height:44px;padding:12px 10px;color:#e7b987;background:#191922;border:1px solid #5c4b3c;border-radius:9px;font-size:12px;cursor:pointer}.download:hover,.choices a:hover{background:#30271f}.choices{position:absolute;z-index:3;right:10px;top:calc(100% - 5px);width:156px;padding:4px;background:#161b27;border:1px solid #5c4b3c;border-radius:10px;box-shadow:0 10px 25px rgba(0,0,0,.45)}.choices a{display:block;padding:12px;min-height:44px;text-decoration:none;border-radius:6px}.empty{color:#c1c6d1;padding:24px 4px}.metadata{font-size:12px;margin-top:24px}.metadata a{display:inline-block;padding:10px 0}noscript a{display:inline-block;margin:4px;padding:8px}@media(min-width:600px){main{padding-top:36px}h1{font-size:34px}article{padding:12px 16px}h2{font-size:16px}.description{font-size:13px}}@supports(padding:max(0px)){main{padding-left:max(14px,env(safe-area-inset-left));padding-right:max(14px,env(safe-area-inset-right))}}
</style></head><body><main>
<a class="back" href="index.html">← ipapplus Repo</a>
<header><div class="heading"><h1>LATEST ADDITIONS</h1><button class="icon-button" id="search-toggle" type="button" aria-label="Search packages" aria-controls="search-form" aria-expanded="false" hidden><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="6"></circle><path d="m15 15 6 6"></path></svg></button></div>
HTML
    $body.='<time class="updated" id="updated" data-updated="'.html($updated//'').'"'.(defined $updated ? ' datetime="'.html($updated).'"' : '').'>'.(defined $updated ? 'Updated '.html(substr($updated,0,10)) : 'Update time unavailable').'</time></header>';
    $body.=<<'HTML';
<div class="search" id="search-form" hidden><label class="sr-only" for="search-input">Search packages by name or identifier</label><input id="search-input" type="search" placeholder="Search packages" autocomplete="off" autocapitalize="none" spellcheck="false"><button class="icon-button" id="search-clear" type="button" aria-label="Clear search">×</button></div>
<div id="package-list">
HTML
    $body.=@$cards ? join('',@$cards) : '<p class="empty">No packages are currently available.</p>';
    $body.=<<'HTML';
</div><p class="empty" id="no-results" hidden>No packages match your search.</p><span class="sr-only" id="search-status" role="status" aria-live="polite"></span>
<p class="metadata"><a href="provenance.json">Archive hashes and upstream metadata (JSON)</a></p>
</main><script>
(function(){
'use strict';
var cards=document.querySelectorAll('article[data-search]'), entries=[], i;
var toggle=document.getElementById('search-toggle'), form=document.getElementById('search-form'), input=document.getElementById('search-input');
var active=null;
function closeMenu(focus){if(!active)return;var previous=active;document.getElementById(previous.getAttribute('aria-controls')).hidden=true;previous.setAttribute('aria-expanded','false');active=null;if(focus)previous.focus();}
var triggers=document.querySelectorAll('[data-selector]');
for(i=0;i<triggers.length;i++){
 triggers[i].addEventListener('click',function(event){event.preventDefault();var opening=active!==this;closeMenu(false);if(opening){active=this;this.setAttribute('aria-expanded','true');var menu=document.getElementById(this.getAttribute('aria-controls'));menu.style.top='';menu.style.bottom='';menu.hidden=false;var box=menu.getBoundingClientRect();if(box.bottom>window.innerHeight&&this.parentNode.parentNode.getBoundingClientRect().top>=box.height){menu.style.top='auto';menu.style.bottom='calc(100% - 5px)';}}});
 triggers[i].setAttribute('role','button');
 triggers[i].setAttribute('aria-expanded','false');
 triggers[i].addEventListener('keydown',function(event){if(event.key===' '||event.keyCode===32){event.preventDefault();this.click();}});
}
document.addEventListener('click',function(event){if(active&&!active.parentNode.contains(event.target))closeMenu(false);else if(active&&event.target!==active&&!active.contains(event.target))closeMenu(false);});
document.addEventListener('keydown',function(event){if(event.key==='Escape'||event.keyCode===27){if(active){closeMenu(true);}else if(!form.hidden){input.value='';filter();form.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}}});
document.addEventListener('focusin',function(event){if(active&&!active.parentNode.contains(event.target))closeMenu(false);});
for(i=0;i<cards.length;i++)entries.push({element:cards[i],text:cards[i].getAttribute('data-search').toLowerCase()});
function filter(){var query=input.value.toLowerCase().replace(/^\s+|\s+$/g,''), count=0;closeMenu(false);for(var n=0;n<entries.length;n++){var match=entries[n].text.indexOf(query)!==-1;entries[n].element.hidden=!match;if(match)count++;}document.getElementById('no-results').hidden=count!==0||entries.length===0;document.getElementById('search-status').textContent=query?count+' package'+(count===1?'':'s')+' found':'';}
toggle.hidden=false;
toggle.addEventListener('click',function(){form.hidden=!form.hidden;toggle.setAttribute('aria-expanded',String(!form.hidden));if(!form.hidden)input.focus();else{input.value='';filter();}});
input.addEventListener('input',filter);
document.getElementById('search-clear').addEventListener('click',function(){input.value='';filter();input.focus();});
var updated=document.getElementById('updated'), date=Date.parse(updated.getAttribute('data-updated'));
function updateTime(){if(!isFinite(date))return;var seconds=Math.floor((Date.now()-date)/1000);if(seconds<0){updated.textContent='Updated '+updated.getAttribute('data-updated').slice(0,10);return;}var value,unit;if(seconds<60){updated.textContent='Updated just now';return;}if(seconds<3600){value=Math.floor(seconds/60);unit='minute';}else if(seconds<86400){value=Math.floor(seconds/3600);unit='hour';}else{value=Math.floor(seconds/86400);unit='day';}updated.textContent='Updated '+value+' '+unit+(value===1?'':'s')+' ago';}
updateTime();setInterval(updateTime,60000);
})();
</script></body></html>
HTML
    return $body;
}

sub update_metadata {
    my (@items)=@_; my (%out,@stanzas,@cards,%groups,@provenance);
    push @{$groups{group_key($_)}},$_ for @items;
    for my $a (@items) {
        my %f=%{$a->{fields}};
        my $id=$a->{id}; $id =~ s/:/_/g;
        my $stem="depictions/$id";
        my $name=$f{Name}//$f{Package};
        my $label=$labels{$f{Architecture}}//$f{Architecture};
        my $details='<h2>Description</h2><p>'.html($f{Description}).'</p><h2>Package details</h2><dl>';
        for my $k (qw(Package Version Architecture Author Maintainer Section Depends Pre-Depends)) {
            next unless exists $f{$k}; $details.='<dt>'.html($k eq 'Depends' ? 'Dependencies' : $k eq 'Pre-Depends' ? 'Required before installation' : $k).'</dt><dd>'.html($f{$k}).'</dd>';
        }
        $details.='<dt>Repository target</dt><dd>'.html($label).'</dd>';
        for my $k (qw(Homepage Depiction SileoDepiction)) {
            next unless exists $f{$k};
            $details.='<dt>'.($k eq 'Homepage' ? 'Homepage' : "Original upstream $k").'</dt><dd>'.metadata_url($f{$k}).'</dd>';
        }
        my $added=$history->{packages}{group_key($a)}{first_added};
        $details.='<dt>First added to repository</dt><dd>'.html($added//'Unknown (no trustworthy import record)').'</dd><dt>Archive SHA256</dt><dd><code>'.$a->{hashes}{SHA256}.'</code></dd>';
        $details.='</dl><p>Architecture and dependency information comes from the archive. Device compatibility has not been independently tested.</p>';
        $details.='<details><summary>Conflicting packages declared by this build</summary><p>'.html($f{Conflicts}).'</p></details>' if exists $f{Conflicts};
        $details.='<p>Firmware requirements, when declared, appear in Dependencies (the firmware package). Upstream links and author names are archive claims, not verified download provenance.</p><h2>Available builds</h2>';
        my @builds=@{$groups{group_key($a)}};
        $details.='<p>'.join(' · ',map {'<a href="../'.html(stem($_)).'.html">'.html(($labels{$_->{fields}{Architecture}}//$_->{fields}{Architecture})).'</a>'} @builds).'</p>'.downloads('../',@builds).'<p><a href="../packages.html">All packages</a></p>';
        $out{"$stem.html"}=page("$name — $label",$details);
        # Decode UTF-8 control values for JSON; HTML and indexes retain original bytes.
        my $title=Encode::decode('UTF-8',"$name — $label",Encode::FB_DEFAULT());
        my @views=({class=>'DepictionHeaderView',title=>$title});
        for my $k (qw(Version Architecture Description Maintainer Depends Pre-Depends)) {
            next unless exists $f{$k}; push @views,{class=>'DepictionTableTextView',title=>$k,text=>Encode::decode('UTF-8',$f{$k},Encode::FB_DEFAULT()|Encode::LEAVE_SRC())};
        }
        push @views,{class=>'DepictionLabelView',text=>'Archive metadata; device compatibility has not been independently tested.'};
        $out{"$stem.json"}=json({class=>'DepictionTabView',minVersion=>'0.4',tabs=>[{class=>'DepictionStackView',tabname=>'Details',views=>\@views}]});
        $f{Depiction}=$base."$stem.html";
        $f{SileoDepiction}=$base."$stem.json";
        $f{Filename}=$a->{path}; $f{Size}=$a->{size};
        @f{qw(MD5sum SHA1 SHA256 SHA512)}=@{$a->{hashes}}{qw(MD5sum SHA1 SHA256 SHA512)};
        push @stanzas,join('',map { "$_: $f{$_}\n" } ('Package',sort grep { $_ ne 'Package' } keys %f));
        push @provenance,{package=>$f{Package},version=>$f{Version},architecture=>$f{Architecture},filename=>$a->{path},sha256=>$f{SHA256},first_added=>$added,
            map { $_=>Encode::decode('UTF-8',$a->{fields}{$_},Encode::FB_DEFAULT()|Encode::LEAVE_SRC()) } grep { exists $a->{fields}{$_} } qw(Author Maintainer Homepage Depiction SileoDepiction)};
    }
    for my $key (sort { $history->{packages}{$b}{sequence}<=>$history->{packages}{$a}{sequence} || sha256_hex($a) cmp sha256_hex($b) || $a cmp $b } keys %groups) {
        my @builds=@{$groups{$key}}; my $f=$builds[0]{fields};
        my $selector='builds-'.sha256_hex($key);
        my $detail=html(stem($builds[0])).'.html';
        my $action;
        if (@builds==1) {
            $action='<a class="download" href="'.html(url_path($builds[0]{path})).'" download aria-label="Download '.html($f->{Name}//$f->{Package}).' — '.html(($labels{$f->{Architecture}}//$f->{Architecture})).'">Download</a>';
        } else {
            $action='<a class="download" href="'.$detail.'" data-selector aria-controls="'.$selector.'" aria-label="Download — choose a build of '.html($f->{Name}//$f->{Package}).'">Download</a><div class="choices" id="'.$selector.'" hidden>';
            $action.=join('',map {'<a href="'.html(url_path($_->{path})).'" download>'.html(($labels{$_->{fields}{Architecture}}//$_->{fields}{Architecture})).'</a>'} @builds).'</div>';
        }
        push @cards,'<article data-search="'.html(join(' ',map {$f->{$_}//''} qw(Name Package Description))).'"><div class="summary"><h2><a href="'.$detail.'">'.html($f->{Name}//$f->{Package}).'</a><span class="version">'.html($f->{Version}).'</span></h2><p class="description">'.html($f->{Description}).'</p><p class="targets">'.join(' · ',map {html(($labels{$_->{fields}{Architecture}}//$_->{fields}{Architecture}))} @builds).'</p></div><div class="action">'.$action.'</div></article>';

    }
    $out{'provenance.json'}=json({schema=>1,note=>'Archive metadata is unverified. Original download sources are unknown unless separately documented.',archives=>\@provenance});
    $out{Packages}=@stanzas ? join("\n",@stanzas)."\n" : '';
    my @dates=sort grep {defined $_} map {$history->{packages}{$_}{first_added}} keys %groups;
    $out{'packages.html'}=catalog_page(\@cards,$dates[-1]);
    return %out;
}
# Archives under debs/ are the inventory. up.sh creates the directory tree
# and moves any archives dropped in the repository root before this runs.
my @paths;
find({no_chdir=>1,wanted=>sub {push @paths,$File::Find::name if /\.deb\z/}},'debs') if -d 'debs';
my (@items,%identities);
for my $path (sort @paths) {
    my $a=archive($path);
    my $id=stem($a);
    die "Duplicate package identity: $path and $identities{$id}\n" if exists $identities{$id};
    $identities{$id}=$path;
    push @items,$a;
}
# Preserve useful first-added chronology, only for groups still present.
die "Invalid package-history.json\n" unless ref($history) eq 'HASH' && ref($history->{packages}) eq 'HASH';
my $sequence=0;
for my $r (values %{$history->{packages}}) {
    die "Invalid package-history.json entry\n" unless ref($r) eq 'HASH' && defined $r->{sequence} && $r->{sequence} =~ /^\d+$/;
    $sequence=$r->{sequence} if $r->{sequence}>$sequence;
}
my %live_history;
for my $a (@items) {
    my $key=group_key($a);
    next if exists $live_history{$key};
    $live_history{$key}=$history->{packages}{$key}//{
        sequence=>++$sequence,first_added=>strftime('%Y-%m-%dT%H:%M:%SZ',gmtime(time))};
}
$history={schema=>1,packages=>\%live_history};
my %out=update_metadata(@items);
$out{'package-history.json'}=json($history);
# Finish every output before touching the live repository.
my $stage=tempdir('.repo-stage-XXXXXX',DIR=>'.',CLEANUP=>1);
write_file("$stage/new/Packages",$out{Packages});
for my $pair (['gz','gzip'],['bz2','bzip2'],['xz','xz']) {
    $out{"Packages.$pair->[0]"}=capture($pair->[1],($pair->[0] eq 'gz' ? ('-n') : ()),'-9','-c',"$stage/new/Packages");
}
# depictions/ is exclusively generated HTML/JSON, not a place for source files.
my @stale;
if (-d 'depictions') {
    opendir my $d,'depictions' or die $!;
    @stale=map {"depictions/$_"} grep {/\.(?:html|json)\z/ && !exists $out{"depictions/$_"}} readdir $d;
    closedir $d;
}
push @stale,grep {-e $_} qw(InRelease Release.gpg);
my %rel=%$cfg;
my %arch=map {$_->{fields}{Architecture}=>1} @items;
$rel{Architectures}=join(' ',sort keys %arch) || $cfg->{Architectures};
die "repo.conf needs Architectures for an empty repository\n" unless $rel{Architectures};
$rel{Date}=strftime('%a, %d %b %Y %H:%M:%S +0000',gmtime(time));
my $release=join('',map {"$_: $rel{$_}\n"} sort keys %rel);
for my $spec (['MD5Sum',\&md5_hex],['SHA256',\&sha256_hex],['SHA512',\&sha512_hex]) {
    $release.="$spec->[0]:\n";
    for my $p (qw(Packages Packages.gz Packages.bz2 Packages.xz)) {
        $release.=' '.$spec->[1]->($out{$p}).' '.length($out{$p})." $p\n";
    }
}
# Keep the publication date on a byte-identical rebuild; change it on updates.
my $changed=@stale || grep {!-f $_ || read_file($_) ne $out{$_}} keys %out;
if (!$changed && -f 'Release') {
    my $old=read_file('Release');
    my ($date)=$old =~ /^Date: (.*)$/m;
    my $stable=$release;
    $stable =~ s/^Date: .*$/Date: $date/m if defined $date;
    $release=$old if $stable eq $old;
}
$out{Release}=$release;
my @replace=sort grep {!-f $_ || read_file($_) ne $out{$_}} keys %out;
write_file("$stage/new/$_",$out{$_}) for @replace;
my (@saved,@installed);
eval {
    local $SIG{INT}=local $SIG{TERM}=sub {die "Rebuild interrupted\n"};
    # Save old files on the same filesystem for rollback on publication errors.
    for my $p (@replace,@stale) {
        die "Generated path is a directory: $p\n" if -d $p;
        next unless -e $p || -l $p;
        make_path(dirname("$stage/old/$p"));
        rename $p,"$stage/old/$p" or die "Save $p: $!\n";
        push @saved,$p;
    }
    my @ordered=(grep {$_ ne 'Release'} @replace);
    push @ordered,grep {$_ eq 'Release'} @replace;
    for my $p (@ordered) {
        make_path(dirname($p));
        rename "$stage/new/$p",$p or die "Publish $p: $!\n";
        push @installed,$p;
    }
    1;
} or do {
    my $error=$@;
    for my $p (reverse @installed) {unlink $p or die "Rollback $p: $! (original error: $error)\n"}
    for my $p (reverse @saved) {rename "$stage/old/$p",$p or die "Restore $p: $! (original error: $error)\n"}
    die $error;
};
print 'Rebuilt repository from ',scalar(@items)," archives.\n";
