<?php
require_once 'facebook-php-sdk/src/facebook.php';
require_once 'fb-app-instance.php'; // softlink to either *-dev.php or *-prod.php
require_once 'fb-auth-check.php'; // authenticates user, sets $user, $user_profile
require_once 'fb-db.php';

// make sure ids are ints
if (!is_numeric($_POST['user1_id']) || !is_numeric($_POST['user2_id']) || !is_numeric($_POST['user3_id'])) {
  exit("User ids invalid!");
}

// check votes
if (!isset($_POST['group1']) || !isset($_POST['group2']) || !isset($_POST['group3'])) {
  exit("Missing votes for each person!");
}

// make sure votes are valid
$valid_votes = array("Marry", "Murder", "Mate");
if (!in_array($_POST['group1'], $valid_votes) || !in_array($_POST['group2'], $valid_votes) || !in_array($_POST['group3'], $valid_votes)) {
  exit("Invalid vote values!");
}

// make sure they selected different values
$choices = array($_POST['group1'], $_POST['group2'], $_POST['group3']);
$unique_choices = array_unique($choices);
if (count($unique_choices) < 3) {
  exit("Must select different values for each person!");
}

// save to db
$user1_id = $_POST['user1_id'];
$user2_id = $_POST['user2_id'];
$user3_id = $_POST['user3_id'];
$group1 = $_POST['group1'];
$group2 = $_POST['group2'];
$group3 = $_POST['group3'];
mysql_query("INSERT INTO mmm_votes (voter_id, user1_id, vote1, user2_id, vote2, user3_id, vote3)
VALUES ('$user', '$user1_id', '$group1', '$user2_id', '$group2', '$user3_id', '$group3')");

echo "OK";
?>