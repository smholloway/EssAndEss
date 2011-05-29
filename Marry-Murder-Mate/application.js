$(document).ready(function() { 
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


  $('#game input[name="gender"]').click(function() {
    var selected = $('#game :checked').val();
    //alert (selected);
    $.ajax({
      type: 'GET',
      data: 'gender='+selected,
      url: 'random-game.php',
      success: function(data) {
        $('body').html(data);
        //alert('Load was performed.');
      }
    });
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
      alert('query = '+ query);
      $.ajax({
        type: 'POST',
        data: query,
        url: 'save-results.php',
        success: function(data) {
          alert('Save was performed.');
        }
      });
    } else {
      alert('Please select Marry, Murder, or Mate for each person')
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
});
