$(document).ready(function() {
  window.fbAsyncInit = function() {
    FB.Canvas.setAutoResize();
  }

  $('#vote-history').hide();
  $('#vote-history-toggle a').click(function() {
    $('#vote-history').toggle(400);
    if ($('#vote-history').html().indexOf("person") < 0) {
      $.ajax({
        type: 'POST',
        url: 'get-voting-history.php',
        success: function(data) {
          //alert('Save was performed.');
          $('#vote-history').html(data);
        }
      });
    }
    return false;
  });
  
  $('#loadingDiv')
    .hide()  // hide it initially
    .ajaxStart(function() {
      $(this).show();
    })
    .ajaxStop(function() {
      $(this).hide();
    });
    
  $('#results')
    .show()  // show it initially
    .ajaxStart(function() {
      $(this).hide();
    })
    .ajaxStop(function() {
      $(this).show();
    });

  $('#game').submit(function() {
    jQuery.flash.success('Success', 'Loading a new game.');
    //load_new_game();
    //return false;
  });

  $('#game input[name="gender"]').click(function() {
    load_new_game();
  });
  
  $('#results').submit(function() {
    if (ensure_one_and_only_one()) {
      var user1_id = $('#user1_id').val();
      var user2_id = $('#user2_id').val();
      var user3_id = $('#user3_id').val();
      var group1   = $('#group1 :checked').val();
      var group2   = $('#group2 :checked').val();
      var group3   = $('#group3 :checked').val();
      var query    = 'user1_id='+user1_id+'&'+
                     'user2_id='+user2_id+'&'+
                     'user3_id='+user3_id+'&'+
                     'group1='+group1+'&'+
                     'group2='+group2+'&'+
                     'group3='+group3;
      //alert('query = '+ query);
      $.ajax({
        type: 'POST',
        data: query,
        url: 'save-results.php',
        success: function(data) {
          //alert('Save was performed.');
          $('#results_submit').attr('disabled', 'disabled');
          jQuery.flash.success('Success', 'Your vote was saved!');
          location.reload( true );
        }
      });
    } else {
      jQuery.flash.error('Error', 'Please select Marry, Murder, or Mate for each person.');
      //alert('Please select Marry, Murder, or Mate for each person')
    }
    return false;
  });
  
  function ensure_one_and_only_one() {
    var checked = new Array();
    $('#results :checked').each(function() { 
      checked.push($(this).val()); 
    });
    return ((jQuery.inArray("Murder", checked) > -1) && (jQuery.inArray("Marry", checked) > -1) && (jQuery.inArray("Mate", checked) > -1));
  }
  
  function load_new_game() {
    var selected = $('#game :checked').val();
		var url = window.location.href;
		if (url.indexOf("gender") == -1) {
			if (url.indexOf("?") == -1) {
				window.location.href = url + "?gender=" + selected;
			} else {
				window.location.href = url + "&gender=" + selected;
			}
		} else {
			url = url.replace( new RegExp("any|female|male", "gi"), selected);
    	window.location.href = url;
		}
    /*
		$.ajax({
      type: 'GET',
      data: 'gender='+selected,
      url: 'random-game.php',
      success: function(data) {
        $('body').html(data);
      }
    });
    */
  }
});
