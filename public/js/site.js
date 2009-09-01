// hej
var offsetSteps = 100;
var cacheLines = [];
var cacheCount = [];
var lastSerialization = '';
var resetOffsetG = false;
//var lastQueryValue = '';

$(document).ready(function() {

	$.ajaxSetup({
		url: "/backend.php",
		type: "POST",
		dataType: "json",
		timeout: 15000,
		success: processResponse
	});
	
	function processCountResponse(data) {
		cacheCount[$('#query').val()] = data;
		var key = lastSerialization;

		if (cacheLines[key]) {
		  processResponse(cacheLines[key]);
		}	else {
		  //console.debug("req. data for: " + key);
		  $.ajax({ data: key });
		}
	}
	
	function nickStr(line) {
	  return "<a href=\"#\" class=\"nick\" rel=\""+line.id+"\">"+line.nick+"</a>";
	}
	
	function processResponse(data) {
		cacheLines[lastSerialization] = data;
		// assume count has been found!
		count = parseInt(cacheCount[$('#query').val()]['count']);
		
		$('#results').html('time elapsed ' + data['time'] + 's <br/><br/>');
		$('#sql').html(data['queries']);
		
		var params = $.fragment();
		var select = 0;
		if (params.select) {
		  select = params.select;
		}
    
		for (var line in data['lines']) {
		  line = data['lines'][line];
		  var str = "";
		  if (select == line.id)
		    str += "<strong>";
		  str += "<a href=\"#\" class=\"select\" rel=\""+line.id+"\">[" + line.at + "]</a>";		
			switch (line.action) {
				case 'MESG':
					str += " &lt;" + nickStr(line) + "&gt; " + line.data + "<br />";
					break;
				case 'ACTI':
					str += " * " + nickStr(line) + " " + line.data + "<br />";
					break;
				case 'NICK':
					str += " <span style=\"color: #900;\">*** " + nickStr(line) + "</span> -NICK-> <span style=\"color: #0AC92B;\">" + line.data + "</span><br />";
					break;
				case 'TOPI':
					str += " ### " + nickStr(line) + " changed topic to '" + line.data + "'<br />";
					break;
				case 'JOIN':
					str += " <span style=\"color: #090;\">&gt;&gt;&gt; " + nickStr(line) + " has joined</span><br />";
					break;
				case 'QUIT':
					str += " <span style=\"color: #900;\">&lt;&lt;&lt; " + nickStr(line) + " has quit</span> (" + line.data + "<br />";
					break;
				default:
					str += "<a href=\"#\" class=\"select\">[" + line.at + "]</a> <span style=\"color: #900;\">*** " + nickStr(line) + " " + line.action + " : " + line.data + "</span><br />";
			}
			if (select == line.id)
		    str += "</strong>";
			$('#results').append(str);
    }
		
		offset = parseInt($('#offset').val());
		if (data['singleDate'] != 'yes') {
			$('#meta').html("Showing " + offset + " - " + (data['lines'].length+offset) + " of " + count + " lines");
		} else {
			$('#meta').html("Showing all " + count + " lines");
		}
		
		$('#queryform input').removeAttr('disabled');
		
		if (offset > 0)
			$('#prevpage').removeAttr('disabled');
		else
			$('#prevpage').attr('disabled', 'disabled');
		
		if (count > data['lines'].length + offset)
			$('#nextpage').removeAttr('disabled');
		else
			$('#nextpage').attr('disabled', 'disabled');
		
		$('#results').show();
		$('#loading').hide();
	}
	
	$(document).bind('requestData', function(e, resetOffset){
	    if (resetOffsetG) {
  	    $('#offset').val(0);
  	  }
  	  resetOffsetG = false;
  	  var querykey = $('#query').val();
  	  lastSerialization = $('#queryform').serialize();
  	  $('#queryform input').attr('disabled', 'disabled');
  	  
  	  $('#meta').html('');
  		if (!cacheCount[querykey]) {
  		  //console.debug("req. count for: " + lastSerialization);
  			$.ajax({ data: lastSerialization+'&count=true', success: processCountResponse });
  		} else {
  		  //console.debug("cached query: " + lastSerialization);
  		  processCountResponse(cacheCount[querykey]);  
  		}
  			
	});

	
	$('#queryform').submit(function() {

	  ////console.debug('submit')
	  
	  resetOffset = true;

		var querykey = $('#query').val();		
    $.setFragment({ "query" : querykey });

		//$(document).trigger('requestData', true);

		return false;
	});
	
  // $('#query').change(function() {
  //   var v = $(this).val();
  //   if (lastQueryValue != v) {
  //     $('#offset').val(0);
  //   }
  //   lastQueryValue = v;
  //   
  // });
	
	$('a.select').live('click', function() {
	  $.setFragment({ "select" : $(this).attr('rel') });
	  $(document).trigger('requestData', false);
	  return false;
	});
	$('a.nick').live('click', function() {
	  $.setFragment({ "select" : $(this).attr('rel'), "query" : "cont:" + $(this).attr('rel') });
	  $('#query').val("cont:" + $(this).attr('rel'));
		$('#offset').val($.fragment().offset);
	  $(document).trigger('requestData', true);
	  return false;
	});

	$('#loading').ajaxStart(function() {
		$('#results').html('');
		$(this).html("Loading... WAIT!").removeClass("error").show();
	});

	$('#loading').ajaxError(function() {
		$(this).html("An error/timeout occured. Please try again.").addClass("error").show();
	});
	
	$('#prevpage').click(function(){
	  var offset = parseInt($('#offset').val()) - offsetSteps;
	  $.setFragment({ "offset" : offset });
		$('#offset').val(offset);
		$(document).trigger('requestData', false);
		//$('#queryform').submit();
		
	});
	
	$('#nextpage').click(function(){
	  var offset = parseInt($('#offset').val()) + offsetSteps;
	  $.setFragment({ "offset" : offset });
		$('#offset').val(offset).change();
		$(document).trigger('requestData', true);
		//$('#queryform').submit();
	});
	
  $.fragmentChange(true);
  $(document).bind("fragmentChange", function(e){
    ////console.debug('fragment was changed');
    $('#query').val($.fragment().query);
		$('#offset').val($.fragment().offset);
		$(document).trigger('requestData', false);
		//$('#queryform').trigger('submit');

  });
  if ($.fragment().query) {
    $('#query').val($.fragment().query);
  	$('#offset').val($.fragment().offset);
  	$(document).trigger('requestData', false);
    //$('#queryform').trigger('submit');
  }
	
});