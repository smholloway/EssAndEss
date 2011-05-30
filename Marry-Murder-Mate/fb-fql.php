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

// smc: fql helper to efficiently get names of all fb ids passed in
function getNames($fb, $ids) {
  $fql = "SELECT uid, name FROM user WHERE uid IN (" . implode(",", $ids) . ")";
  
  $response = $fb->api(array(
    'method' => 'fql.query',
    'query' => $fql,
  ));
  
  $name_by_id = array();
  foreach ($response as $r) {
    $name_by_id[$r['uid']] = $r['name'];
  }
  
  return $name_by_id;
}

// smc: fql helper to efficiently get names of all fb ids passed in
function getPictures($fb, $ids) {
  $fql = "SELECT uid, pic_square FROM user WHERE uid IN (" . implode(",", $ids) . ")";
  
  $response = $fb->api(array(
    'method' => 'fql.query',
    'query' => $fql,
  ));
  
  $picture_by_id = array();
  foreach ($response as $r) {
    $picture_by_id[$r['uid']] = $r['pic_square'];
  }
  
  return $picture_by_id;
}
?>
