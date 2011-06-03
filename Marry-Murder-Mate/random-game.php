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

      <div>
        <?php 
        include("get-my-history.php");
        ?>
      </div>

      <div id="votes">
        <div id="vote-history-toggle"><a href="#">&plusmn; Your Voting History</a></div>
        <div id="vote-history" style="width: 500px; padding: 0; margin: 0;">
        </div>
      </div>
    
      <div id="footer">
        <p>Copyright &copy; 2011. Questions or comments? <a href="mailto:marry.murder.mate@gmail.com">Contact Us</a></p>
        <p>*This is a game! It is also known as Murder Marry Mate, Mate Marry Murder, F*ck Marry Kill, or Screw Marry Kill. We do not condone violence. By using this service you accept all responsibility and absolve the creators of all liability.</p>

 				<div id="links_to_play">
					<a href="http://pairstream.com/random-game.php">Play on Pairstream</a> | 
					<a href="http://apps.facebook.com/marry-murder-mate/">Play on Facebook</a>
				</div>
      </div>
    
			<div id="addthis">
      	<!-- AddThis Button BEGIN -->
      	<div class="addthis_toolbox addthis_default_style">
        	<span style="float:left; color: #333; font-weight: bold; font-size: 11px;">Share the fun: &nbsp;</span>
        	<a class="addthis_button_preferred_1"></a>
        	<a class="addthis_button_preferred_2"></a>
        	<a class="addthis_button_preferred_3"></a>
        	<a class="addthis_button_preferred_4"></a>
        	<a class="addthis_button_compact"></a>
        	<a class="addthis_counter addthis_bubble_style"></a>
      	</div>
      	<script type="text/javascript">var addthis_config = {"data_track_clickback":true};</script>
      	<script type="text/javascript" src="http://s7.addthis.com/js/250/addthis_widget.js#pubid=ra-4de41719301eed24"></script>
      	<!-- AddThis Button END -->
			</div>
      
      <br/>

			<div id="extra">
			The best facebook game ever! This game will cause no harm! It will not cause a heart attack, AIDS, or cancer (Mesothelioma, Leukemia, Carcinoma, Kaposi Sarcoma, Atypical Teratoid, Rhabdoid Tumor, etc). There's nothing bad except the risk associated with computers, mobile devices, or monitors. Pairstream Software is two highly educated web developers with skills including Photoshop, Illustrator, design, Ruby, Java, C# (C Sharp), C, C++, Python, PHP, CSS, HTML, JavaScript, Rails, Yii, Erlang, RESTful APIs, SQL, ORMs, and more. We like to do cool stuff!
			<a href="http://pairstream.com/random-game.php">Pairstream - Marry Murder Mate</a>
			<a href="http://apps.facebook.com/marry-murder-mate/">Facebook - Marry Murder Mate</a>

			</div>

      <br/>
      
      <div id="sda-backwards">
        <script type="text/javascript"><!--
        google_ad_client = "ca-pub-2003017988956692";
        /* wide banner */
        google_ad_slot = "9559483834";
        google_ad_width = 468;
        google_ad_height = 60;
        //-->
        </script>
        <script type="text/javascript"
        src="http://pagead2.googlesyndication.com/pagead/show_ads.js">
        </script>
        
        <script type="text/javascript"><!--
        google_ad_client = "ca-pub-2003017988956692";
        /* large rectangle */
        google_ad_slot = "6317581198";
        google_ad_width = 336;
        google_ad_height = 280;
        //-->
        </script>
        <script type="text/javascript"
        src="http://pagead2.googlesyndication.com/pagead/show_ads.js">
        </script>
      
        <script type="text/javascript"><!--
        google_ad_client = "ca-pub-2003017988956692";
        /* large rectangle */
        google_ad_slot = "6317581198";
        google_ad_width = 336;
        google_ad_height = 280;
        //-->
        </script>
        <script type="text/javascript"
        src="http://pagead2.googlesyndication.com/pagead/show_ads.js">
        </script>
      </div>
    </div>
  </body>
</html>
