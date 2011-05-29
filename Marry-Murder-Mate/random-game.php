<?php
require_once 'facebook-php-sdk/src/facebook.php';
require_once 'fb-app-instance.php'; // softlink to either *-dev.php or *-prod.php
require_once 'fb-auth-check.php'; // authenticates user, sets $user, $user_profile
require_once 'fb-helpers.php';
require_once 'fb-fql.php';
require_once 'fb-db.php';

// smc: closure for gender based array_filter
function createGenderCheck($g, $fb) {
  $friends_with_genders = getFriendsGender($fb);
  return function ($f) use ($g, $fb, $friends_with_genders) {
    $id = $f['id'];
    return $friends_with_genders[$id] == $g;
  };
}

// Login or logout url will be needed depending on current user state.
if ($user) {
  $logoutUrl = $facebook->getLogoutUrl();
} else {
  $loginUrl = $facebook->getLoginUrl();
}

$friends = null;
$friends_count = 0;
if ($user) {
  $result = $facebook->api('/me/friends');
  $friends = $result['data'];
  
  // smc: prune based on gender
  $valid_genders = array("male", "female");
  if (isset($_GET['gender']) && in_array($_GET['gender'], $valid_genders)) {
    $gender = $_GET['gender'];
    $filtered_friends = array_filter($friends, createGenderCheck($gender, $facebook));
    $friends = $filtered_friends;
  }
  
  $friends_count = count($friends);
}

?>
<!doctype html>
<html xmlns:fb="http://www.facebook.com/2008/fbml">
  <head>
    <title>Marry Murder Mate</title>
    <link href="main.css" media="screen" rel="stylesheet" type="text/css">
    <script type="text/javascript" src="jquery.min.js"></script>
		<script type="text/javascript" src="application.js"></script>
		<script type="text/javascript" src="jquery.flash.js"></script>
  </head>
  <body>
    <h1>Marry Murder Mate</h1>

    <form id="game" name="game" action="random-game.php" method="get">
      <input type="radio" name="gender" value="male" <?php echo isset($_GET['gender']) && $_GET['gender'] == "male" ? "checked" : ""; ?> />Male 
      <input type="radio" name="gender" value="female" <?php echo isset($_GET['gender']) && $_GET['gender'] == "female" ? "checked" : ""; ?> />Female 
      <input type="radio" name="gender" value="any" <?php echo !isset($_GET['gender']) || $_GET['gender'] == "any" ? "checked" : ""; ?> />Any
      <input type="submit" value="New Game" />
    </form>
    <br />
    
    <?php if ($user): ?>

      <?php if ($friends): ?>
        <?php
          shuffle($friends);
          $indices = getRandIndices($friends_count); // 3 by default
        ?>
        
        <div id="loadingDiv"><img src="loading.gif"></div>
        
        <form id="results" name="results" action="save-results.php" method="post">
          <input type="hidden" id="user1_id" name="user1_id" value="<?php echo $friends[$indices[0]]['id'] ?>">
          <input type="hidden" id="user2_id" name="user2_id" value="<?php echo $friends[$indices[1]]['id'] ?>">
          <input type="hidden" id="user3_id" name="user3_id" value="<?php echo $friends[$indices[2]]['id'] ?>">

          <div class="person">
            <div class="name"><?php echo $friends[$indices[0]]['name'] ?></div>
            <div class="pic"><img src="https://graph.facebook.com/<?php echo $friends[$indices[0]]['id']; ?>/picture?type=square"></div>
            <div class="vote" id="group1">
              <input type="radio" name="group1" value="Marry">Marry<br/>
              <input type="radio" name="group1" value="Murder">Murder<br/>
              <input type="radio" name="group1" value="Mate">Mate<br/>
            </div>
          </div>
          <div class="person">
            <div class="name"><?php echo $friends[$indices[1]]['name'] ?></div>
            <div class="pic"><img src="https://graph.facebook.com/<?php echo $friends[$indices[1]]['id']; ?>/picture?type=square"></div>
            <div class="vote" id="group2">
              <input type="radio" name="group2" value="Marry">Marry<br/>
              <input type="radio" name="group2" value="Murder">Murder<br/>
              <input type="radio" name="group2" value="Mate">Mate<br/>
            </div>
          </div>        
          <div class="person">
            <div class="name"><?php echo $friends[$indices[2]]['name'] ?></div>
            <div class="pic"><img src="https://graph.facebook.com/<?php echo $friends[$indices[2]]['id']; ?>/picture?type=square"></div>
            <div class="vote" id="group3">
              <input type="radio" name="group3" value="Marry">Marry<br/>
              <input type="radio" name="group3" value="Murder">Murder<br/>
              <input type="radio" name="group3" value="Mate">Mate<br/>
            </div>
          </div>
          <br style="clear:both"/>
          <input id="results_submit" type="submit" value="Save Selections" />
        </form>
      <?php endif ?>
      
    <?php endif ?>
    
    <div id="flash"></div>
    
    <br />
    <a href="#" id="vote-history-toggle">Vote History</a>
    <div id="vote-history">
      <?php
      // show users votes TODO: do one massive query for names or save them; make AJAX?
      $result = mysql_query("SELECT * FROM mmm_votes WHERE voter_id = $user ORDER BY added DESC");
      while ($row = mysql_fetch_array($result)) {
        echo $row['added'] . ' ';
        echo $row['user1_id'] . ' => ' . $row['vote1'] . ', ';
        echo $row['user2_id'] . ' => ' . $row['vote2'] . ', ';
        echo $row['user3_id'] . ' => ' . $row['vote3'];
        echo "<br />";
      }
      ?>
    </div>
  </body>
</html>
