<?php

// smc: helper function to pull N indices from [0, $count-1] at random
function getRandIndices($count, $n = 3) {
  $indices = array();
  while (count($indices) < $n) {
    $i = rand(0, $count-1);
    if (in_array($i, $indices)) {
      continue;
    }
    array_push($indices, $i);
  }
  return $indices;
}

?>
