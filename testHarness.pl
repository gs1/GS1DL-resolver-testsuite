#!/usr/bin/perl
use CGI::Carp qw(fatalsToBrowser);
use strict;
use utf8;
use LWP::UserAgent;

############################################################################
# Functions for GS1 Digital Link Test Suite
############################################################################

######### We're going to need a User Agent
use constant UAstring => 'GS1_Resolver_Test/0.1';
my $browser= LWP::UserAgent-> new();
$browser->requests_redirectable([]); #(suppress all redirects, we want the resolver's response, not the target's)
my @reqHeaders = (
  'User-Agent' => UAstring,
  'Accept' => '*/*'
);

my %h = &parseQuery($ENV{'QUERY_STRING'});

my $text;

print "Content-type: application/json\n\n";

if ($h{'test'}) { # So we have a test to carry out
  if (($h{'test'} eq 'getHTTPversion') && ($h{'testVal'})) {
    $text = '{"test":"'.$h{'test'}.'","testVal":"'.$h{'testVal'}.'","result":"';
    $text .= getHTTPversion($h{'testVal'});
    $text .= '"}';
  } elsif (($h{'test'} eq 'getAllHeaders') && ($h{'testVal'})) {
    my $accept;
    if ($h{'accept'} eq 'json') {
      $accept = 'application/json';
    } elsif ($h{'accept'} eq 'jld') {
      $accept = 'application/ld+json';
    } else {
      $accept = '*/*';
    }
    my $acceptLang = $h{'acceptLang'} ne '' ? $h{'acceptLang'} : 'en';
    $text = '{"test":"'.$h{'test'}.'","testVal":"'.$h{'testVal'}.'","accept":"'.$accept.'","result":';
    $text .= getAllHeaders($h{'testVal'}, $accept, $acceptLang);
    $text =~ s/(.*),$/$1/;  # Remove final comma
    $text .= '}}';
  }
} else {
    $text .= "No command received\n";
}


print $text;


## Helper functions ##

sub parseQuery {
  my $query = $_[0];
  my @pairs = split('&', $query);
  my $name;
  my $value;
  my @h;
  foreach (@pairs) {
    ($name, $value) = split(/=/, $_);
    push (@h, $name, url_decode($value));
  }
  return @h;
}

sub url_encode {
  my $r = shift;
  $r =~ s/([^a-z0-9_.!~*'() -])/sprintf "%%%02X", ord($1)/gei;
  $r =~ tr/ /+/;
  return $r;
}

sub url_decode {
  my $r = shift;
  $r =~ tr/\+/ /;
  $r =~ s/%([a-f0-9][a-f0-9])/chr( hex( $1 ) )/gei;
  return $r;
}

sub getHTTPversion {
  $_ = shift;
  my $domain = "http://".$_;
  my $curlResponse = `curl -I $domain`;
  $curlResponse =~ /HTTP\/(\d\.\d).*/;
  return $1;
}

sub getAllHeaders {
  my $uri = shift;
  my $accept = shift;
  my $acceptLang = shift;
  my @reqHeaders = (
    'User-Agent' => UAstring,
    'Accept' => $accept,
    'Accept-Language' => $acceptLang
  );

  my $response = $browser->head($uri, @reqHeaders);		# Do head request
#  die "Hmm, error \"", $response->status_line(), "\" when getting $uri" unless $response->is_success(); # We do't actually want to fail on non 2xx codes
  my @headersObject = $response->headers();
  my $text = "{";
  $text .= '"httpCode":"'.$response->code().'",';   # We want the HTTP codes in our result object, even though they're not actual HTTP headers
  $text .= '"httpMsg":"'.$response->message().'",';
  $text .= '"requestURI":"'.$ENV{'QUERY_STRING'}.'",';
  $text .= '"AcceptHeader":"'.$accept.'",';
  foreach my $h (@headersObject) {
    for my $header (keys %$h) {
      if (ref($h->{$header}) eq 'ARRAY') {  # This happens if the server sends multiple headers of the same type, which seems to be allowed :-(
        $text .= '"'.$header.'":';
        $text .= '[';
        my $i = 0;
        while ($h->{$header}[$i] ne '') {
          $h->{$header}[$i] =~s/"/\\"/g;    # espace any " characters
          $text .= '"'.$h->{$header}[$i].'",';
          $i++;
        }
        $text =~ s/(.*),$/$1/;    # removes final comma
        $text .= '],';
      } else {
        $h->{$header} =~s/"/\\"/g;
        $text .= '"'.$header.'":"'.$h->{$header}.'",';
      }
    }
  }
  return $text;
}


###########################################


# A little function useful for debugging

sub showAllHeaders {
  my $uri = shift;
  my $response = $browser->head($uri, @reqHeaders);		# Do head request
  die "Hmm, error \"", $response->status_line(), "\" when getting $uri" unless $response->is_success();
  my @headersObject = $response->headers();
  my $text = "Headers for $uri are:\n\n";
  foreach my $h (@headersObject) {
    for my $header (keys %$h) {
      $text .= "$header=$h->{$header}\n\n";
    }
  }
  return $text;
}
