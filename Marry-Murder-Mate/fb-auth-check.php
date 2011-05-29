<?php
require_once 'facebook-php-sdk/src/facebook.php';
require_once 'fb-app-instance.php';

// Get User ID
$user = $facebook->getUser();

// We may or may not have this data based on whether the user is logged in.
//
// If we have a $user id here, it means we know the user is logged into
// Facebook, but we don't know if the access token is valid. An access
// token is invalid if the user logged out of Facebook.
if ($user) {
  try {
    // Proceed knowing you have a logged in user who's authenticated.
    $user_profile = $facebook->api('/me');
  } catch (FacebookApiException $e) {
    error_log($e);
    $user = null;
  }
}

if (!$user) {
  // redirect to the oath login url if not logged in already
  $url = $facebook->getLoginUrl();
  header("Location: $url");
}
?>
