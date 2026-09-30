#!/usr/bin/env perl
use strict;
use warnings;
use Digest::SHA qw(sha256_hex sha512_hex sha1_hex);
use Digest::MD5 qw(md5_hex);
use JSON::PP;
use File::Temp qw(tempdir);
use File::Path qw(make_path remove_tree);
use File::Copy qw(copy);
use File::Basename qw(dirname);
use Cwd qw(abs_path);
use Fcntl qw(:flock);
use POSIX qw(strftime);

# No shell interpolation, package installation, maintainer-script execution, or network access.
sub read_file { my ($p)=@_; open my $f,'<:raw',$p or die "$p: $!\n"; local $/; return <$f> // ''; }
sub write_file { my ($p,$s)=@_; make_path(dirname($p)); open my $f,'>:raw',$p or die "$p: $!\n"; print $f $s or die "$p: $!\n"; close $f or die "$p: $!\n"; chmod 0644,$p or die "$p: $!\n"; }
sub capture { my @cmd=@_; open my $f,'-|',@cmd or die "Cannot run $cmd[0]: $!\n"; binmode $f; local $/; my $out=<$f>; close $f or die "Command failed (@cmd), status $?\n"; return $out // ''; }
sub fields {
    my ($text)=@_; my (%f,%seen,$key); $text =~ s/\r\n/\n/g;
    for (split /\n/,$text) {
        next if $_ eq '';
        die "Control character in metadata\n" if /[\x00-\x08\x0b-\x1f\x7f]/;
        if (/^[ \t]/) { die "Orphan continuation\n" unless defined $key; $f{$key}.="\n$_"; next; }
        die "Invalid control line: $_\n" unless /^([A-Za-z0-9][-A-Za-z0-9]*):[ \t]*(.*)$/;
        ($key,my $value)=($1,$2); die "Duplicate field $key\n" if $seen{lc $key}++;
        die "Control character in $key\n" if $value =~ /[\x00-\x08\x0b-\x1f\x7f]/;
        $f{$key}=$value;
    }
    return \%f;
}
sub html { my $s=shift // ''; $s =~ s/&/&amp;/g; $s =~ s/</&lt;/g; $s =~ s/>/&gt;/g; $s =~ s/"/&quot;/g; $s =~ s/'/&#39;/g; return $s; }
sub json { JSON::PP->new->canonical->pretty->utf8->encode($_[0]); }
my %labels=('iphoneos-arm'=>'Rootful','iphoneos-arm64'=>'Rootless','iphoneos-arm64e'=>'RootHide','all'=>'All architectures');
my $root=abs_path(dirname(__FILE__).'/..');
my $mode=shift @ARGV // 'auto';
$mode='rebuild' if $mode eq 'build'; # compatibility alias
my (@sources,$remove_id,%filter);
if ($mode eq 'import') {
    @sources=map { die "Symlink input rejected: $_\n" if -l $_; abs_path($_) // die "Missing input: $_\n" } @ARGV;
    die "Usage: ./up.sh import ARCHIVE [...]\n" unless @sources;
} elsif ($mode eq 'remove') {
    $remove_id=shift @ARGV // die "Usage: ./up.sh remove PACKAGE_ID [--arch ARCH] [--version VERSION]\n";
    die "Invalid package ID\n" unless $remove_id =~ /^[a-z0-9][a-z0-9+.-]+$/;
    while (@ARGV) {
        my $key=shift @ARGV;
        die "Use --arch ARCH and/or --version VERSION once each\n" unless ($key eq '--arch' || $key eq '--version') && @ARGV && !exists $filter{$key};
        $filter{$key}=shift @ARGV;
    }
} else {
    die "Usage: ./up.sh [rebuild|check|list|clean|remove PACKAGE_ID [--arch ARCH] [--version VERSION]|import ARCHIVE...|snapshot]\n"
        unless $mode =~ /^(?:auto|rebuild|check|list|clean|snapshot)$/ && !@ARGV;
}
chdir $root or die "$root: $!\n";
my $cfg=fields(read_file('repo.conf'));
my $base=delete $cfg->{'URL'} // die "repo.conf requires URL\n";
die "URL must be an HTTPS directory without query/fragment\n" unless $base =~ m{^https://[A-Za-z0-9.-]+(?::[0-9]+)?/(?:[A-Za-z0-9._~/-]*/)?$};
my %allowed=map { $_=>1 } split / +/,$cfg->{Architectures};
my $json=JSON::PP->new->utf8;
my $history;
sub group_key { join('/', @{$_[0]->{fields}}{qw(Package Version)}) }
sub history {
    my ($reconcile,$new,@items)=@_;
    die "History must not be a symlink\n" if -l 'package-history.json';
    $history=-f 'package-history.json' ? $json->decode(read_file('package-history.json')) : {schema=>1,packages=>{}};
    die "Missing package-history.json; run ./up.sh rebuild\n" if !$reconcile && !-f 'package-history.json';
    die "Invalid package history\n" unless ref($history) eq 'HASH' && ($history->{schema}//0)==1 && ref($history->{packages}) eq 'HASH';
    my ($max,%sequences)=(0);
    for my $key (keys %{$history->{packages}}) {
        my $r=$history->{packages}{$key};
        die "Invalid history entry\n" unless $key =~ m{^[a-z0-9][a-z0-9+.-]+/[0-9][A-Za-z0-9.+:~\-]*$} && ref($r) eq 'HASH' && ($r->{sequence}//'') =~ /^\d+$/ &&
            ((!defined($r->{first_added}) && $r->{sequence}==0) || (defined($r->{first_added}) && $r->{first_added} =~ /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/ && $r->{sequence}>0));
        die "Duplicate history sequence\n" if $r->{sequence} && $sequences{$r->{sequence}}++;
        $max=$r->{sequence} if $r->{sequence}>$max;
    }
    for my $a (@items) {
        my $key=group_key($a); next if exists $history->{packages}{$key};
        die "Missing package history for $key; run ./up.sh rebuild\n" unless $reconcile;
        # Directly restored managed archives have unknown history. Root imports are observed additions.
        $history->{packages}{$key}={sequence=>$new->{$key} ? ++$max : 0,
            first_added=>$new->{$key} ? strftime('%Y-%m-%dT%H:%M:%SZ',gmtime(time)) : undef};
    }
}
sub canonical { my $id=$_[0]->{id}; $id =~ s/:/_/g; return "debs/$id.deb"; }
sub stem { my $id=$_[0]->{id}; $id =~ s/:/_/g; return "depictions/$id"; }
sub downloads {
    my ($prefix,@builds)=@_;
    return '<div class="downloads">'.join('',map {
        my $arch=$_->{fields}{Architecture}; my $short=$arch; $short =~ s/^iphoneos-//;
        '<a class="download" href="'.html($prefix.$_->{path}).'">Download - '.html($short).'</a>'
    } @builds).'</div>';
}
sub metadata_url {
    my $url=shift;
    return html($url) unless $url =~ m{^https?://[^\s<>"\x00-\x1f]+$}i;
    return '<a rel="noreferrer" href="'.html($url).'">'.html($url).'</a>';
}

sub archive {
    my ($path)=@_;
    die "Not a regular, non-symlink archive: $path\n" unless -f $path && !-l $path;
    my $initial_hash=sha256_hex(read_file($path));
    my $f=fields(capture('dpkg-deb','--field',$path));
    for my $key (qw(Package Version Architecture Maintainer Description)) { die "$path: missing $key\n" unless length($f->{$key}//''); }
    die "$path: invalid Package\n" unless $f->{Package}=~/^[a-z0-9][a-z0-9+.-]+$/;
    die "$path: invalid Version\n" unless $f->{Version}=~/^(?:\d+:)?[0-9][A-Za-z0-9.+:~\-]*$/;
    capture('dpkg','--validate-version',$f->{Version});
    die "$path: unsupported Architecture $f->{Architecture}; review repo.conf\n" unless $allowed{$f->{Architecture}};
    for my $k (qw(Package Version Architecture Maintainer)) { die "$path: multiline $k\n" if $f->{$k}=~/\n/; }
    die "$path: invalid Installed-Size\n" if exists $f->{'Installed-Size'} && $f->{'Installed-Size'} !~ /^\d+$/;
    # Read the data archive too; never extract or execute its contents.
    capture('dpkg-deb','--contents',$path);
    my $data=read_file($path);
    die "Archive changed during inspection: $path\n" unless sha256_hex($data) eq $initial_hash;
    return {fields=>$f,path=>$path,data=>$data,id=>join('_',@$f{qw(Package Version Architecture)})};
}
sub inventory {
    die "debs must not be a symlink\n" if -l 'debs';
    return () unless -e 'debs';
    opendir my $d,'debs' or die "debs: $!\n";
    my @names=sort grep { $_ ne '.' && $_ ne '..' } readdir $d; closedir $d;
    my (@items,%ids,%hashes);
    for my $name (@names) {
        die "Unexpected file in debs/: $name. Move candidate archives to the repository root and run ./up.sh; review other files separately.\n" unless $name =~ /^[A-Za-z0-9][A-Za-z0-9._+~-]*\.deb$/;
        my $a=archive("debs/$name");
        die "Duplicate package/version/architecture: $a->{id}\n" if $ids{$a->{id}}++;
        die "Duplicate archive content: $name\n" if $hashes{sha256_hex($a->{data})}++;
        die "Noncanonical archive: $a->{path}; expected ".canonical($a).". Move it to the repository root and run ./up.sh\n" unless $a->{path} eq canonical($a);
        push @items,$a;
    }
    return @items;
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

sub products {
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
        $details.='<dt>First added to repository</dt><dd>'.html($added//'Unknown (no trustworthy import record)').'</dd><dt>Archive SHA256</dt><dd><code>'.sha256_hex($a->{data}).'</code></dd>';
        $details.='</dl><p>Architecture and dependency information comes from the archive. Device compatibility has not been independently tested.</p>';
        $details.='<details><summary>Conflicting packages declared by this build</summary><p>'.html($f{Conflicts}).'</p></details>' if exists $f{Conflicts};
        $details.='<p>Firmware requirements, when declared, appear in Dependencies (the firmware package). Upstream links and author names are archive claims, not verified download provenance.</p><h2>Available builds</h2>';
        my @builds=@{$groups{group_key($a)}};
        $details.='<p>'.join(' · ',map {'<a href="../'.html(stem($_)).'.html">'.html($labels{$_->{fields}{Architecture}}).'</a>'} @builds).'</p>'.downloads('../',@builds).'<p><a href="../packages.html">All packages</a></p>';
        $out{"$stem.html"}=page("$name — $label",$details);
        # Decode UTF-8 control values for JSON; HTML and indexes retain original bytes.
        my $title=Encode::decode('UTF-8',"$name — $label",Encode::FB_CROAK());
        my @views=({class=>'DepictionHeaderView',title=>$title});
        for my $k (qw(Version Architecture Description Maintainer Depends Pre-Depends)) {
            next unless exists $f{$k}; push @views,{class=>'DepictionTableTextView',title=>$k,text=>Encode::decode('UTF-8',$f{$k},Encode::FB_CROAK()|Encode::LEAVE_SRC())};
        }
        push @views,{class=>'DepictionLabelView',text=>'Archive metadata; device compatibility has not been independently tested.'};
        $out{"$stem.json"}=json({class=>'DepictionTabView',minVersion=>'0.4',tabs=>[{class=>'DepictionStackView',tabname=>'Details',views=>\@views}]});
        $f{Depiction}=$base."$stem.html";
        $f{SileoDepiction}=$base."$stem.json";
        $f{Filename}=$a->{path}; $f{Size}=length $a->{data};
        $f{MD5sum}=md5_hex($a->{data}); $f{SHA1}=sha1_hex($a->{data}); $f{SHA256}=sha256_hex($a->{data}); $f{SHA512}=sha512_hex($a->{data});
        push @stanzas,join('',map { "$_: $f{$_}\n" } ('Package',sort grep { $_ ne 'Package' } keys %f));
        push @provenance,{package=>$f{Package},version=>$f{Version},architecture=>$f{Architecture},filename=>$a->{path},sha256=>$f{SHA256},first_added=>$added,
            map { $_=>Encode::decode('UTF-8',$a->{fields}{$_},Encode::FB_CROAK()|Encode::LEAVE_SRC()) } grep { exists $a->{fields}{$_} } qw(Author Maintainer Homepage Depiction SileoDepiction)};
    }
    for my $key (sort { $history->{packages}{$b}{sequence}<=>$history->{packages}{$a}{sequence} || sha256_hex($a) cmp sha256_hex($b) || $a cmp $b } keys %groups) {
        my @builds=@{$groups{$key}}; my $f=$builds[0]{fields};
        my $selector='builds-'.scalar(@cards);
        my $detail=html(stem($builds[0])).'.html';
        my $action;
        if (@builds==1) {
            $action='<a class="download" href="'.html($builds[0]{path}).'" download aria-label="Download '.html($f->{Name}//$f->{Package}).' — '.html($labels{$f->{Architecture}}).'">Download</a>';
        } else {
            $action='<a class="download" href="'.$detail.'" data-selector aria-controls="'.$selector.'" aria-label="Download — choose a build of '.html($f->{Name}//$f->{Package}).'">Download</a><div class="choices" id="'.$selector.'" hidden>';
            $action.=join('',map {'<a href="'.html($_->{path}).'" download>'.html($labels{$_->{fields}{Architecture}}).'</a>'} @builds).'</div>';
        }
        push @cards,'<article data-search="'.html(join(' ',map {$f->{$_}//''} qw(Name Package Description))).'"><div class="summary"><h2><a href="'.$detail.'">'.html($f->{Name}//$f->{Package}).'</a><span class="version">'.html($f->{Version}).'</span></h2><p class="description">'.html($f->{Description}).'</p><p class="targets">'.join(' · ',map {html($labels{$_->{fields}{Architecture}})} @builds).'</p></div><div class="action">'.$action.'</div></article>';

    }
    $out{'provenance.json'}=json({schema=>1,note=>'Archive metadata is unverified. Original download sources are unknown unless separately documented.',archives=>\@provenance});
    $out{Packages}=@stanzas ? join("\n",@stanzas)."\n" : '';
    my @dates=sort grep {defined $_} map {$history->{packages}{$_}{first_added}} keys %groups;
    $out{'packages.html'}=catalog_page(\@cards,$dates[-1]);
    $out{'generated-files.json'}=json({schema=>1,depictions=>{map { $_=>sha256_hex($out{$_}) } grep {m{^depictions/}} keys %out}});
    return %out;
}
use Encode ();

sub verify {
    my (@items)=@_; my %expected=products(@items);
    safe_path($_) for (keys %expected,qw(Packages.gz Packages.bz2 Packages.xz Release package-history.json InRelease Release.gpg));
    my $home=read_file('index.html');
    $home =~ s{<(script|style)\b[^>]*>.*?</\1>}{}sg;
    my @home_tags;
    while ($home =~ /<(\/?)([a-z][a-z0-9]*)(?:\s[^<>]*?)?>/g) {
        my ($end,$tag)=($1,$2); next if $tag =~ /^(?:meta|link|img|br|hr|input)$/;
        if ($end) { die "Unbalanced home page HTML\n" unless @home_tags && pop(@home_tags) eq $tag; }
        else { push @home_tags,$tag; }
    }
    die "Unclosed home page HTML\n" if @home_tags;
    if (-e 'InRelease' || -e 'Release.gpg') {
        die "Incomplete signatures\n" unless -f 'InRelease' && -f 'Release.gpg';
        capture('gpg','--verify','Release.gpg','Release');
        die "InRelease content mismatch\n" unless capture('gpg','--decrypt','InRelease') eq read_file('Release');
    }
    for my $p (sort keys %expected) { die "Stale or missing $p; run ./up.sh rebuild\n" unless -f $p && read_file($p) eq $expected{$p}; }
    for my $p (keys %expected) {
        if ($p =~ /\.json$/) {
            my $j=$json->decode(read_file($p));
            die "Invalid Sileo depiction $p\n" if $p =~ m{^depictions/} && !($j->{class} eq 'DepictionTabView' && $j->{minVersion} eq '0.4' && @{$j->{tabs}});
        } elsif ($p =~ /\.html$/) {
            my @stack; my $text=read_file($p);
            $text =~ s{<(script|style)\b[^>]*>.*?</\1>}{}sg;
            while ($text =~ /<(\/?)([a-z][a-z0-9]*)(?:\s[^<>]*?)?>/g) {
                my ($end,$tag)=($1,$2); next if $tag =~ /^(?:meta|link|img|br|hr|input)$/;
                if ($end) { die "Unbalanced HTML $p\n" unless @stack && pop(@stack) eq $tag; }
                else { push @stack,$tag; }
            }
            die "Unclosed HTML $p\n" if @stack;
        }
    }
    for my $pair (['gz','gzip'],['bz2','bzip2'],['xz','xz']) {
        die "Corrupt Packages.$pair->[0]\n" unless capture($pair->[1],'-dc',"Packages.$pair->[0]") eq $expected{Packages};
    }
    my $release=fields(read_file('Release'));
    for my $k (keys %$cfg) { next if $k eq 'Architectures'; die "Release differs from config: $k\n" unless ($release->{$k}//'') eq $cfg->{$k}; }
    my %arch=map { $_->{fields}{Architecture}=>1 } @items;
    die "Release architectures mismatch\n" unless $release->{Architectures} eq (@items ? join(' ',sort keys %arch) : join(' ',sort keys %allowed));
    die "Missing UTC Release date\n" unless ($release->{Date}//'') =~ /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} \+0000$/;
    for my $spec (['MD5Sum',\&md5_hex],['SHA256',\&sha256_hex],['SHA512',\&sha512_hex]) {
        my %seen;
        for my $line (split /\n/,$release->{$spec->[0]}//'') {
            next if $line eq ''; my ($hash,$size,$file)=$line =~ /^\s*([a-f0-9]+) (\d+) (Packages(?:\.(?:gz|bz2|xz))?)$/;
            die "Invalid Release checksum: $line\n" unless defined $file && !$seen{$file}++;
            my $data=read_file($file); die "Release mismatch: $file\n" unless $hash eq $spec->[1]->($data) && $size==length $data;
        }
        die "Incomplete Release $spec->[0]\n" unless keys(%seen)==4;
    }
    # Check every generated local href, including downloads and depiction pages.
    for my $p ('index.html',grep {/\.html$/} keys %expected) {
        my $text=read_file($p);
        while ($text =~ /(?:href|src)="([^"#]+)"/g) {
            my $url=$1; next if $url =~ /^[a-z][a-z0-9+.-]*:/i;
            die "Broken local link $p -> $url\n" unless -f dirname($p)."/$url";
        }
    }
    if (-d 'depictions') {
        opendir my $d,'depictions' or die $!;
        for (readdir $d) { next if /^\./; die "Unmanaged/stale depiction: $_\n" unless exists $expected{"depictions/$_"}; }
        closedir $d;
    }
    die "Unmanaged Packages.zst; remove or explicitly support it\n" if -e 'Packages.zst';
    print "PASS: ".scalar(@items)." archives, all control metadata (documented depiction overrides), 3 compressed indexes, Release hashes/sizes/date/architectures, generated depictions and local links\n";
}

# Directory flock also protects read-only commands when .repo.lock does not exist.
# Never unlink .repo.lock: that would let two processes lock different inodes.
my $readonly=$mode eq 'check' || $mode eq 'list';
open my $directory_lock,'<','.' or die "Directory lock: $!\n";
flock($directory_lock,($readonly ? LOCK_SH : LOCK_EX)|LOCK_NB) or die "Another repository operation is running\n";
die "Lock symlink rejected\n" if -l '.repo.lock';
my $lock;
if (!$readonly || -e '.repo.lock') {
    open $lock,($readonly ? '<' : '>>'),'.repo.lock' or die "Lock: $!\n";
    flock($lock,($readonly ? LOCK_SH : LOCK_EX)|LOCK_NB) or die "Another repository operation is running\n";
}
sub safe_path {
    my $p=shift;
    die "Unsafe transaction path\n" unless $p =~ m{^(?:Packages(?:\.(?:gz|bz2|xz))?|Release|InRelease|Release\.gpg|packages\.html|provenance\.json|generated-files\.json|package-history\.json|(?:debs|depictions)/[A-Za-z0-9][A-Za-z0-9._+~-]*\.(?:deb|html|json)|[^/\x00-\x1f]+\.deb)$};
    die "Unsafe output $p\n" if -l $p || -l dirname($p) || (-e $p && !-f $p);
}
sub plain_tree {
    my ($dir)=@_;
    die "Unsafe directory $dir\n" unless -d $dir && !-l $dir;
    opendir my $d,$dir or die $!;
    for my $name (readdir $d) {
        next if $name eq '.' || $name eq '..';
        my $p="$dir/$name";
        die "Unsafe artifact $p\n" if -l $p || (!-f $p && !-d $p);
        plain_tree($p) if -d $p;
    }
    closedir $d;
}
sub disposable_stage {
    my ($dir,$prefix)=@_; $prefix //= '';
    opendir my $d,$dir or die $!;
    my @names=grep {$_ ne '.' && $_ ne '..'} readdir $d; closedir $d;
    for my $name (@names) {
        my $relative=$prefix.$name;
        if (-d "$dir/$name") {
            return 0 unless $relative eq 'depictions' && disposable_stage("$dir/$name",'depictions/');
        } else {
            return 0 unless $relative =~ m{^(?:\.owner|Packages(?:\.(?:gz|bz2|xz))?|Release|InRelease|Release\.gpg|packages\.html|provenance\.json|generated-files\.json|depictions/[A-Za-z0-9][A-Za-z0-9._+~-]*\.(?:html|json))$};
        }
    }
    return 1;
}
sub recover_transaction {
    return unless -e '.repo-transaction' || -l '.repo-transaction';
    die "Pending transaction; run ./up.sh rebuild to recover (check/list/clean do not repair)\n" if $readonly || $mode eq 'clean' || $mode eq 'snapshot';
    plain_tree('.repo-transaction');
    if (-f '.repo-transaction/COMMITTED' && read_file('.repo-transaction/COMMITTED') eq "ipapplus committed v1\n") {
        remove_tree('.repo-transaction'); return;
    }
    my $j=$json->decode(read_file('.repo-transaction/journal.json'));
    die "Invalid recovery journal; preserve .repo-transaction for manual recovery\n" unless ref($j) eq 'HASH' && ($j->{schema}//0)==1 && ref($j->{before}) eq 'HASH';
    for my $p (keys %{$j->{before}}) {
        safe_path($p);
        my $hash=$j->{before}{$p};
        die "Damaged rollback copy for $p; preserve .repo-transaction\n" if defined($hash) && ($hash !~ /^[a-f0-9]{64}$/ || sha256_hex(read_file(".repo-transaction/before/$p")) ne $hash);
        die "Invalid rollback timestamp\n" if defined($hash) && ($j->{mtimes}{$p}//'') !~ /^\d+$/;
    }
    # Copies remain available until the entire rollback succeeds, making recovery repeatable.
    for my $p ((sort grep {$_ ne 'Release'} keys %{$j->{before}}),'Release') {
        next unless exists $j->{before}{$p};
        if (defined $j->{before}{$p}) {
            write_file('.repo-transaction/restore',read_file(".repo-transaction/before/$p"));
            make_path(dirname($p)); rename '.repo-transaction/restore',$p or die "Restore $p: $!\n";
            utime $j->{mtimes}{$p},$j->{mtimes}{$p},$p or die "Restore timestamp $p: $!\n";
        } elsif (-e $p) { unlink $p or die "Remove incomplete $p: $!\n"; }
    }
    remove_tree('.repo-transaction');
    die "Rollback completed but temporary cleanup failed\n" if -e '.repo-transaction';
    print "Recovered previous state from interrupted transaction.\n";
}
recover_transaction();
if ($mode eq 'clean') {
    my $count=0;
    for my $dir (sort glob('.repo-stage-*')) {
        next unless -d $dir && !-l $dir && -f "$dir/.owner" && !-l "$dir/.owner";
        next unless read_file("$dir/.owner") eq "ipapplus disposable stage v1\n";
        plain_tree($dir);
        # Transaction rollback material is never disposable, even under a stage name.
        next if -e "$dir/journal.json" || -e "$dir/before";
        next unless disposable_stage($dir);
        remove_tree($dir); die "Clean failed: $dir\n" if -e $dir;
        print "Removed disposable stage $dir\n"; $count++;
    }
    print "Clean: $count owned temporary directories removed; unknown artifacts preserved.\n";
    exit 0;
}
my $automatic=$mode eq 'auto';
# Discover root candidates first; generated indexes are never an import input.
if ($automatic) { opendir my $d,'.' or die $!; @sources=sort grep {/\.deb$/} readdir $d; closedir $d; }
my @items=inventory();
if ($mode eq 'list') {
    my %groups; push @{$groups{group_key($_)}},$_ for @items;
    for my $key (sort keys %groups) {
        my $f=$groups{$key}[0]{fields};
        print "\n",($f->{Name}//$f->{Package}),"\nPackage: $f->{Package}\nVersion: $f->{Version}\n";
        for my $a (@{$groups{$key}}) { printf "%-9s %s\n",$labels{$a->{fields}{Architecture}},$a->{fields}{Architecture}; }
    }
    print "\n".scalar(@items)." archives; ".scalar(keys %groups)." package/version groups.\n";
    exit 0;
}
if ($mode eq 'check' || $mode eq 'snapshot') {
    eval { history(0,{},@items); verify(@items); 1 } or die "$@Run ./up.sh rebuild after addressing any invalid authoritative input.\n";
}
if ($mode eq 'check') { exit 0; }
if ($mode eq 'snapshot') {
    my $dest=$ENV{REPO_SNAPSHOT_DIR}//die "Set REPO_SNAPSHOT_DIR to a new absolute path outside repository\n";
    die "Unsafe snapshot destination\n" unless $dest =~ m{^/} && !-e $dest && !-l $dest;
    my $parent=abs_path(dirname($dest))//die "Snapshot parent missing\n";
    die "Snapshot must be outside repository\n" if $parent eq $root || index($parent,"$root/")==0;
    my $stage=tempdir('repo-snapshot-XXXXXX',DIR=>$parent,CLEANUP=>1);
    my %files=products(@items);
    for my $p (keys %files,qw(Packages.gz Packages.bz2 Packages.xz Release index.html CydiaIcon.png LICENSE SECURITY.md),map {$_->{path}} @items) { write_file("$stage/$p",read_file($p)); }
    for my $p (qw(InRelease Release.gpg)) { write_file("$stage/$p",read_file($p)) if -f $p; }
    rename $stage,$dest or die "Snapshot rename: $!\n";
    print "Validated publication snapshot: $dest (not published)\n"; exit 0;
}
my (%changes,%new_groups,%counts,@cleanup);
my $imported=0;
if ($mode eq 'remove') {
    die "Unknown architecture filter\n" if exists $filter{'--arch'} && !$allowed{$filter{'--arch'}};
    my @selected=grep { $_->{fields}{Package} eq $remove_id &&
        (!exists($filter{'--arch'}) || $_->{fields}{Architecture} eq $filter{'--arch'}) &&
        (!exists($filter{'--version'}) || $_->{fields}{Version} eq $filter{'--version'}) } @items;
    die "No matching managed archives; nothing removed\n" unless @selected;
    print "Package: $remove_id\n";
    my $version='';
    for my $a (@selected) {
        my $f=$a->{fields}; print "\nVersion $f->{Version}:\n" if $version ne $f->{Version}; $version=$f->{Version};
        print "- $f->{Architecture} ($labels{$f->{Architecture}}) $a->{path}\n";
    }
    print "Remove this package and rebuild repository? [y/N] "; $|=1;
    my $answer=<STDIN> // ''; chomp $answer;
    if ($answer !~ /^(?:y|yes)$/i) { print "Cancelled; repository unchanged.\n"; exit 0; }
    my %remove=map {$_->{path}=>1} @selected;
    $changes{$_}=undef for keys %remove;
    @items=grep {!$remove{$_->{path}}} @items;
}
if ($automatic || $mode eq 'import') {
    my %ids=map {$_->{id}=>$_} @items;
    my %known_groups=map {group_key($_)=>1} @items;
    for my $src (@sources) {
        my $a=archive($automatic ? "./$src" : $src); my $hash=sha256_hex($a->{data}); my $dest=canonical($a);
        if (my $old=$ids{$a->{id}}) {
            die "Conflicting bytes for $a->{id}; use a new version\n" unless sha256_hex($old->{data}) eq $hash;
            print "Already imported: $a->{id}\n";
        } else {
            die "Refusing to overwrite $dest\n" if -e $dest || -l $dest;
            $a->{path}=$dest; $ids{$a->{id}}=$a; push @items,$a;
            $changes{$dest}=$a->{data}; $imported++; $counts{$a->{fields}{Architecture}}++;
            $new_groups{group_key($a)}=1 unless $known_groups{group_key($a)};
        }
        if ($automatic) { push @cleanup,[$src,$dest,$hash]; $changes{$src}=undef; }
    }
    @items=sort {$a->{path} cmp $b->{path}} @items;
}
history(1,\%new_groups,@items);
my $history_bytes=json($history);
$changes{'package-history.json'}=$history_bytes unless -f 'package-history.json' && read_file('package-history.json') eq $history_bytes;
my $stage=tempdir('.repo-stage-XXXXXX',DIR=>'.',CLEANUP=>1);
write_file("$stage/.owner","ipapplus disposable stage v1\n");
if ($mode ne 'import') {
    die "Signed metadata exists; set REPO_SIGNING_KEY to its fingerprint\n" if (-e 'InRelease' || -e 'Release.gpg') && !$ENV{REPO_SIGNING_KEY};
    die "Unmanaged Packages.zst; review it before rebuilding\n" if -e 'Packages.zst';
    my %out=products(@items);
    die "Depictions must be a real directory\n" if -l 'depictions' || (-e 'depictions' && !-d 'depictions');
    my @stale;
    if (-d 'depictions') {
        opendir my $d,'depictions' or die $!;
        @stale=map {"depictions/$_"} grep {$_ ne '.' && $_ ne '..' && !exists $out{"depictions/$_"}} readdir $d; closedir $d;
    }
    if (@stale) {
        my $owned=-f 'generated-files.json' && !-l 'generated-files.json' ? $json->decode(read_file('generated-files.json')) : {};
        for my $p (@stale) {
            safe_path($p);
            die "Unrecognized or modified stale depiction $p; preserve it outside depictions/ before ./up.sh rebuild\n"
                unless ref($owned->{depictions}) eq 'HASH' && ($owned->{depictions}{$p}//'') eq sha256_hex(read_file($p));
            $changes{$p}=undef;
        }
    }
    write_file("$stage/Packages",$out{Packages});
    $out{'Packages.gz'}=capture('gzip','-n','-9','-c',"$stage/Packages");
    $out{'Packages.bz2'}=capture('bzip2','-9','-c',"$stage/Packages");
    $out{'Packages.xz'}=capture('xz','-9','-c',"$stage/Packages");
    my %rel=%$cfg; my %arch=map { $_->{fields}{Architecture}=>1 } @items;
    $rel{Architectures}=@items ? join(' ',sort keys %arch) : join(' ',sort keys %allowed);
    my $epoch=$ENV{SOURCE_DATE_EPOCH}//time;
    die "Invalid SOURCE_DATE_EPOCH\n" unless $epoch=~/^\d+$/;
    $rel{Date}=strftime('%a, %d %b %Y %H:%M:%S +0000',gmtime($epoch));
    my $release=join('',map { "$_: $rel{$_}\n" } sort keys %rel);
    for my $spec (['MD5Sum',\&md5_hex],['SHA256',\&sha256_hex],['SHA512',\&sha512_hex]) {
        $release.="$spec->[0]:\n";
        for my $p (qw(Packages Packages.gz Packages.bz2 Packages.xz)) { $release.=' '.$spec->[1]->($out{$p}).' '.length($out{$p})." $p\n"; }
    }
    # Keep an unchanged repository unchanged; explicit reproducible-build dates win.
    if (!defined $ENV{SOURCE_DATE_EPOCH} && -f 'Release') {
        my $previous=read_file('Release');
        my ($date)=$previous =~ /^Date: ([A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} \+0000)$/m;
        if (defined $date) {
            my $stable=$release;
            $stable =~ s/^Date: .*$/Date: $date/m;
            $release=$previous if $stable eq $previous;
        }
    }
    $out{Release}=$release;
    for my $p (sort keys %out) { write_file("$stage/$p",$out{$p}); }
    if (my $key=$ENV{REPO_SIGNING_KEY}) {
        die "Use a full signing fingerprint\n" unless $key =~ /\A[0-9A-Fa-f]{40}(?:[0-9A-Fa-f]{24})?\z/;
        for my $pair (['InRelease','--clearsign'],['Release.gpg','--detach-sign']) {
            capture('gpg','--batch','--yes','--local-user',$key,'--digest-algo','SHA256','--armor','--output',"$stage/$pair->[0]",$pair->[1],"$stage/Release");
            capture('gpg','--verify',"$stage/$pair->[0]",($pair->[0] eq 'Release.gpg' ? ("$stage/Release") : ()));
            $out{$pair->[0]}=read_file("$stage/$pair->[0]");
        }
    }
    # Validate the complete candidate tree before changing any live archive or output.
    for my $a (@items) { write_file("$stage/$a->{path}",$a->{data}); die "Staged archive hash mismatch\n" unless sha256_hex(read_file("$stage/$a->{path}")) eq sha256_hex($a->{data}); }
    for my $p (qw(index.html CydiaIcon.png)) { write_file("$stage/$p",read_file($p)); }
    write_file("$stage/package-history.json",$history_bytes);
    chdir $stage or die $!;
    my $ok=eval { verify(@items); 1 }; my $error=$@;
    chdir $root or die $!; die $error unless $ok;
    for my $p (keys %out) {
        safe_path($p);
        $changes{$p}=$out{$p} unless -f $p && read_file($p) eq $out{$p};
    }
}
# Back up every touched file before publication, including root import sources.
# The journal survives process death; a later mutating command restores the old tree.
my (%before,%mtimes);
for my $p (sort keys %changes) {
    safe_path($p);
    $before{$p}= -f $p ? sha256_hex(read_file($p)) : undef;
    $mtimes{$p}=(stat($p))[9] if defined $before{$p};
    write_file("$stage/before/$p",read_file($p)) if defined $before{$p};
    die "Rollback copy hash mismatch for $p\n" if defined($before{$p}) && sha256_hex(read_file("$stage/before/$p")) ne $before{$p};
    write_file("$stage/after/$p",$changes{$p}) if defined $changes{$p};
}
write_file("$stage/journal.json",json({schema=>1,before=>\%before,mtimes=>\%mtimes}));
rename $stage,'.repo-transaction' or die "Activate transaction: $!\n";
my $ok=eval {
    local $SIG{INT}=local $SIG{TERM}=local $SIG{HUP}=sub {die "Interrupted; rolling back\n"};
    # Publish verified archive copies, history, generated metadata, then Release.
    my @paths=((sort grep {m{^debs/} && defined $changes{$_}} keys %changes),
        (grep {exists $changes{$_}} 'package-history.json'),
        (sort grep {$_ ne 'Release' && $_ ne 'package-history.json' && !m{^debs/} && defined $changes{$_}} keys %changes),
        (grep {exists $changes{$_}} 'Release'));
    for my $p (@paths) {
        safe_path($p); make_path(dirname($p));
        rename ".repo-transaction/after/$p",$p or die "Replace $p: $!\n";
        die "Published hash mismatch $p\n" unless sha256_hex(read_file($p)) eq sha256_hex($changes{$p});
    }
    for my $c (@cleanup) {
        die "Import SHA256 verification failed; keeping sources\n" unless !-l $c->[0] && sha256_hex(read_file($c->[0])) eq $c->[2] && sha256_hex(read_file($c->[1])) eq $c->[2];
        print "Verified SHA256: $c->[2] -> $c->[1]\n";
    }
    for my $p (sort grep {!defined $changes{$_}} keys %changes) { safe_path($p); unlink $p or die "Remove $p: $!\n"; }
    verify(@items) unless $mode eq 'import';
    write_file('.repo-transaction/COMMITTED',"ipapplus committed v1\n");
    1;
};
if (!$ok) { my $error=$@; recover_transaction(); die "Operation failed; previous state restored: $error"; }
remove_tree('.repo-transaction');
print "Operation complete. No commit, push or publication performed.\n";
if ($mode eq 'import') { print "Sources retained. Run ./up.sh rebuild.\n"; exit 0; }
if ($automatic) {
    my $apt='SKIP (apt-get or apt-cache unavailable)';
    if ($ENV{REPO_PORTABLE_TESTS}) { $apt='SKIP (portable tests; run scripts/test-apt.pl on target APT)'; }
    elsif ((grep {-x "$_/apt-get"} split /:/,$ENV{PATH}) && (grep {-x "$_/apt-cache"} split /:/,$ENV{PATH})) {
        system($^X,'scripts/test-apt.pl')==0 or die "APT validation: FAIL (repository built; inspect test output)\n"; $apt='PASS';
    }
    print "\nImported: $imported\n";
    for my $a (qw(iphoneos-arm iphoneos-arm64 iphoneos-arm64e)) { print "$labels{$a}: ".($counts{$a}//0)."\n"; }
    print "Packages index: PASS\nRelease metadata: PASS\nDepictions: PASS\nAPT validation: $apt\n\nLocal repository validation complete.\n";
}
