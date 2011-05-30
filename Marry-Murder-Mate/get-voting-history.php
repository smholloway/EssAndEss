<?php
require_once 'facebook-php-sdk/src/facebook.php';
require_once 'fb-app-instance.php'; // softlink to either *-dev.php or *-prod.php
require_once 'fb-auth-check.php'; // authenticates user, sets $user, $user_profile
require_once 'fb-helpers.php';
require_once 'fb-fql.php';
require_once 'fb-db.php';

?>

<?php
// populate for fql
$result = mysql_query("SELECT * FROM mmm_votes WHERE voter_id = $user ORDER BY added DESC LIMIT 25");
if (mysql_num_rows($result) > 0) {
  $user_ids_all = array();
  while ($row = mysql_fetch_array($result)) {
    array_push($user_ids_all, $row['user1_id'], $row['user2_id'], $row['user3_id']);
  }
  $user_ids = array_unique($user_ids_all);
  $user_names = getNames($facebook, $user_ids);
  $user_pics = getPictures($facebook, $user_ids);

  // display
  mysql_data_seek($result, 0);
  while ($row = mysql_fetch_array($result)) {
    ?>
    <div class="person">
      <div class="name"><?php echo $user_names[$row['user1_id']]; ?></div>
      <div class="pic"><img src="<?php echo $user_pics[$row['user1_id']]; ?>"></div>
      <div style="font-weight: bold; text-align: center;">
        <?php echo $row['vote1']; ?>
      </div>
    </div>
    <div class="person">
      <div class="name"><?php echo $user_names[$row['user2_id']]; ?></div>
      <div class="pic"><img src="<?php echo $user_pics[$row['user2_id']]; ?>"></div>
      <div style="font-weight: bold; text-align: center;">
        <?php echo $row['vote2']; ?>
      </div>
    </div>
    <div class="person">
      <div class="name"><?php echo $user_names[$row['user3_id']]; ?></div>
      <div class="pic"><img src="<?php echo $user_pics[$row['user3_id']]; ?>"></div>
      <div style="font-weight: bold; text-align: center;">
        <?php echo $row['vote3']; ?>
      </div>
    </div>
    <br style="clear:both"/>
  <?php
  }
}

mysql_free_result($result)

?>