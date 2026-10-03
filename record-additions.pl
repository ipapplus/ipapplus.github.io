use strict;
use warnings;
use JSON::PP;
use POSIX qw(strftime);
use File::Temp qw(tempfile);

# Fail if the permanent record is missing or invalid; never silently reset it.
my $path = 'latest-additions.json';
open my $record, '<:raw', $path or die "Read $path: $!\n";
my $json = JSON::PP->new->utf8->pretty->canonical;
my $entries = $json->decode(do { local $/; <$record> });
close $record;
die "Expected an array in $path\n" unless ref($entries) eq 'ARRAY';
my %seen;
for my $entry (@$entries) {
    die "Invalid or duplicate entry in $path\n"
        unless ref($entry) eq 'HASH' && $entry->{package}
        && defined($entry->{name}) && defined($entry->{version})
        && defined($entry->{addedAt}) && !$seen{$entry->{package}}++;
}

open my $index, '<:encoding(UTF-8)', $ARGV[0] or die "Read package index: $!\n";
my $added = 0;
my $now = strftime('%Y-%m-%dT%H:%M:%SZ', gmtime);
local $/ = '';
while (my $block = <$index>) {
    my %fields = $block =~ /^([\w-]+):[ \t]*(.*)$/mg;
    my $id = $fields{Package} or next;
    next if $seen{$id};
    die "Missing version for $id\n" unless $fields{Version};
    push @$entries, {
        name => $fields{Name} || $id,
        package => $id,
        version => $fields{Version},
        addedAt => $now,
    };
    $seen{$id} = 1;
    $added++;
}
close $index;
if ($added) {
    my ($file, $temporary) = tempfile('latest-additions.XXXXXX', DIR => '.', UNLINK => 1);
    binmode $file, ':raw';
    print {$file} $json->encode($entries) or die "Write additions: $!\n";
    close $file or die "Close additions: $!\n";
    chmod 0644, $temporary or die "Set additions permissions: $!\n";
    rename $temporary, $path or die "Save additions: $!\n";
}
