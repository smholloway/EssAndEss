<?php
require_once 'facebook-php-sdk/src/facebook.php';
require_once 'fb-app-instance.php'; // softlink to either *-dev.php or *-prod.php
require_once 'fb-auth-check.php'; // authenticates user, sets $user, $user_profile
require_once 'fb-db.php';

// show users votes TODO: do one massive query for names or save them
$result = mysql_query("SELECT * FROM mmm_votes WHERE voter_id = $user ORDER BY added DESC");
while ($row = mysql_fetch_array($result)) {
  echo $row['added'] . ' ';
  echo $row['user1_id'] . ' => ' . $row['vote1'] . ', ';
  echo $row['user2_id'] . ' => ' . $row['vote2'] . ', ';
  echo $row['user3_id'] . ' => ' . $row['vote3'];
  echo "<br />";
}
?>