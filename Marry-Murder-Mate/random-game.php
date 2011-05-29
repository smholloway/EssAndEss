<?php

require_once 'facebook-php-sdk/src/facebook.php';
require_once 'fb-app-instance.php'; // softlink to either *-dev.php or *-prod.php
require_once 'fb-auth-check.php'; // authenticates user, sets $user, $user_profile
require_once 'fb-helpers.php';
require_once 'fb-fql.php';

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
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js"></script>
  </head>
  <body>
    <h1>Marry Murder Mate</h1>

    <form name="input" action="random-game.php" method="get">
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
        <form name="results" action="save-results.php" method="post">
          <input type="hidden" name="user1_id" value="<?php echo $friends[$indices[0]]['id'] ?>">
          <input type="hidden" name="user2_id" value="<?php echo $friends[$indices[1]]['id'] ?>">
          <input type="hidden" name="user3_id" value="<?php echo $friends[$indices[2]]['id'] ?>">
          <table>
            <tr>
              <td><?php echo $friends[$indices[0]]['name'] ?></td>
              <td><?php echo $friends[$indices[1]]['name'] ?></td>
              <td><?php echo $friends[$indices[2]]['name'] ?></td>
            </tr>
            <tr>
              <td><img src="https://graph.facebook.com/<?php echo $friends[$indices[0]]['id']; ?>/picture"></td>
              <td><img src="https://graph.facebook.com/<?php echo $friends[$indices[1]]['id']; ?>/picture"></td>
              <td><img src="https://graph.facebook.com/<?php echo $friends[$indices[2]]['id']; ?>/picture"></td>
            </tr>
            <tr>
              <td><input type="radio" name="group1" value="Marry">Marry</td>
              <td><input type="radio" name="group2" value="Marry">Marry</td>
              <td><input type="radio" name="group3" value="Marry">Marry</td>
            </tr>
            <tr>
              <td><input type="radio" name="group1" value="Murder">Murder</td>
              <td><input type="radio" name="group2" value="Murder">Murder</td>
              <td><input type="radio" name="group3" value="Murder">Murder</td>
            </tr>
            <tr>
              <td><input type="radio" name="group1" value="Mate">Mate</td>
              <td><input type="radio" name="group2" value="Mate">Mate</td>
              <td><input type="radio" name="group3" value="Mate">Mate</td>
            </tr>
          </table>
          <input type="submit" value="Save Selections" />
        </form>
      <?php endif ?>
      
    <?php endif ?>
  </body>
</html>
