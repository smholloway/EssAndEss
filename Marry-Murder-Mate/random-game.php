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
    <div id="site">
    <div id="header">
      <h1>Marry Murder Mate*</h1>
    </div>

    <form id="game" name="game" action="random-game.php" method="get">
      <input type="radio" name="gender" value="male" <?php echo isset($_GET['gender']) && $_GET['gender'] == "male" ? "checked" : ""; ?> />Male 
      <input type="radio" name="gender" value="female" <?php echo isset($_GET['gender']) && $_GET['gender'] == "female" ? "checked" : ""; ?> />Female 
      <input type="radio" name="gender" value="any" <?php echo !isset($_GET['gender']) || $_GET['gender'] == "any" ? "checked" : ""; ?> />Any
      <br/>
      <input id="game_submit" type="submit" value="New Game" />
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

    <div id="votes">
      <a href="#" id="vote-history-toggle">Vote History</a>
      <div id="vote-history" style="width: 500px; padding: 0; margin: 0;">
        <?php
        // populate for fql
        $result = mysql_query("SELECT * FROM mmm_votes WHERE voter_id = $user ORDER BY added DESC");
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
        
        mysql_free_result($result)
        ?>
      </div>
    </div>
    
    <div id="footer">
      <p>Copyright &copy; 2011. All rights reserved.</p>
      <p>*This is a game. We do not condone violence. By using this service you have absolved the creators of all liability.</p>
    </div>
    </div>
  </body>
</html>
