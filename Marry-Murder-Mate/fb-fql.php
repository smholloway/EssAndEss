<?php

// smc: fql helper to efficiently get gender info for all friends at once
// array is keyed by user id
function getFriendsGender($fb) {
  $fql = "SELECT uid, sex FROM user WHERE uid IN (SELECT uid2 FROM friend WHERE uid1 = me())";
  
  $response = $fb->api(array(
    'method' => 'fql.query',
    'query' => $fql,
  ));
  
  $gender_by_id = array();
  foreach ($response as $r) {
    $gender_by_id[$r['uid']] = $r['sex'];
  }
  
  return $gender_by_id;
}

?>
