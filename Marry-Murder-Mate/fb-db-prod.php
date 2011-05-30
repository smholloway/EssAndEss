<?php
$con = mysql_connect("localhost", "pairstre_mmm", "8Vgg52VtBvJJaq04p");
if (!$con) {
  die('Could not connect to DB: ' . mysql_error());
}
mysql_select_db("pairstre_mmm", $con);
?>
