<?php
  require_once 'fb-auth-check.php'; // authenticates user, sets $user, $user_profile
  
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
  
  print_r($_POST);
  
  // TODO: save
?>