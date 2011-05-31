<?php
require_once 'facebook-php-sdk/src/facebook.php';
require_once 'fb-app-instance.php'; // softlink to either *-dev.php or *-prod.php
require_once 'fb-auth-check.php'; // authenticates user, sets $user, $user_profile
require_once 'fb-helpers.php';
require_once 'fb-fql.php';
require_once 'fb-db.php';

$user_votes = array();

$fake_user = 7953046;
//$user = $fake_user;

// populate for fql
$result1 = mysql_query("SELECT vote1 FROM mmm_votes WHERE user1_id = $user ORDER BY added DESC");
$result2 = mysql_query("SELECT vote2 FROM mmm_votes WHERE user2_id = $user ORDER BY added DESC");
$result3 = mysql_query("SELECT vote3 FROM mmm_votes WHERE user3_id = $user ORDER BY added DESC");

if (mysql_num_rows($result1) > 0) {
  while ($row = mysql_fetch_array($result1)) {
    array_push($user_votes, $row['vote1']);
  }
}
if (mysql_num_rows($result2) > 0) {
  while ($row = mysql_fetch_array($result2)) {
    array_push($user_votes, $row['vote2']);
  }
}
if (mysql_num_rows($result3) > 0) {
  while ($row = mysql_fetch_array($result3)) {
    array_push($user_votes, $row['vote3']); 
  }
}

mysql_free_result($result1);
mysql_free_result($result2);
mysql_free_result($result3);

echo '<div id="histogram">';

if (count($user_votes) > 0) {
  $vote_histogram = array("Marry" => 0, "Murder" => 0, "Mate" => 0);
  foreach ($user_votes as $v) {
    $count = $vote_histogram[$v] + 1;
    $vote_histogram[$v] = $count;
  }
} else {
  echo 'You have no votes, yet. Get your friends to play and discover your true love potential!';  
}

  // display
  foreach ($vote_histogram as $key => $value) {
    ?>
<div id="<?php echo $key; ?>"><?php echo $key.': '.$value; ?></div>
  <?php
  }
  echo '</div>';

?>