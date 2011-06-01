<?php
require_once 'facebook-php-sdk/src/facebook.php';
require_once 'fb-app-instance.php'; // softlink to either *-dev.php or *-prod.php
require_once 'fb-auth-check.php'; // authenticates user, sets $user, $user_profile
require_once 'fb-helpers.php';
require_once 'fb-fql.php';
require_once 'fb-db.php';

$user_votes = array();

// populate for fql
$result1 = mysql_query("SELECT vote1 FROM mmm_votes WHERE user1_id = '$user'");
$result2 = mysql_query("SELECT vote2 FROM mmm_votes WHERE user2_id = '$user'");
$result3 = mysql_query("SELECT vote3 FROM mmm_votes WHERE user3_id = '$user'");

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
$vote_histogram = array("Marry" => 0, "Murder" => 0, "Mate" => 0);
$user_vote_count = count($user_votes);

if ($user_vote_count > 0) {
  echo "Here is how your friends voted for you ($user_vote_count votes):<br /><br />";
  foreach ($user_votes as $v) {
    $count = $vote_histogram[$v] + 1;
    $vote_histogram[$v] = $count;
  }
} else {
  echo 'You have not received any votes, yet. Get your friends to play and discover your true love potential!';  
}

// display
if ($user_vote_count > 0) {
  foreach ($vote_histogram as $key => $value) {
  ?>
  <div id="<?php echo $key; ?>">
    <?php echo $key.': '.$value; ?> <br />
	  <div class="progress-container" style="width: 100px">          
      <div style="width: <?php echo ($value / $user_vote_count) * 100; ?>%"></div> 
    </div>
  </div>
  <div style="clear:both;"></div>
  <?php
  }
}
echo '</div>';

?>
