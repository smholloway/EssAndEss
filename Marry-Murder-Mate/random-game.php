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
  </head>
  <body>
    <h1>Marry Murder Mate</h1>

    <form name="input" action="random-game.php" method="get">
      <input type="radio" name="gender" value="male" <?php echo isset($_GET['gender']) && $_GET['gender'] == "male" ? "checked" : ""; ?> />Male 
      <input type="radio" name="gender" value="female" <?php echo isset($_GET['gender']) && $_GET['gender'] == "female" ? "checked" : ""; ?> />Female 
      <input type="radio" name="gender" value="any" <?php echo !isset($_GET['gender']) || $_GET['gender'] == "any" ? "checked" : ""; ?> />Any
      <br />
      <input type="submit" value="Submit" />
    </form>

    <?php if ($user): ?>

      <?php if ($friends): ?>
        <?php
          shuffle($friends);
          $indices = getRandIndices($friends_count); // 3
        ?>
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
        </table>
      <?php endif ?>

      <?php if ($friends): ?>
        <h4>Your friends of the selected gender (<?php echo $friends_count; ?>):</h4>
        <?php
          foreach ($friends as $f) {
            $name = $f['name'];
            $id = $f['id'];
        ?>
            <?php echo $name; ?><br />
        <?php
          }
        ?>
      <?php endif ?>
      
    <?php endif ?>
  </body>
</html>
