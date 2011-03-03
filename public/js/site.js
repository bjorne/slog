var offsetSteps = 100;
var cacheLines = [];
var cacheCount = [];
var lastSerialization = '';
var resetOffsetG = false;

$(document).ready(function() {

  $.ajaxSetup({
    url: "/backend.php",
    type: "POST",
    dataType: "json",
    timeout: 15000,
    success: processResponse
  });
  
  
  $(document).bind('requestData', function(e, resetOffset){
    if (resetOffsetG) {
      $('#offset').val(0);
    }

    resetOffsetG = false;
    var querykey = $('#query').val();
    lastSerialization = $('#queryform').serialize();

    $('#offset, #submit').attr('disabled', 'disabled');
    $('#meta').html('');

    if (!cacheCount[querykey]) {
      $.ajax({ data: lastSerialization+'&count=true', success: processCountResponse });
    } else {
      processCountResponse(cacheCount[querykey]);  
    }
    
  });

  
  $('#queryform').submit(function() {

    resetOffset = true;

    var querykey = $('#query').val();		
    $.setFragment({ "query" : querykey });

    return false;
  });
  
  $('a.select').live('click', function() {
    $.setFragment({ "select" : $(this).attr('rel') });
    $(document).trigger('requestData', false);
    return false;
  });
  $('a.nick').live('click', function() {
    $.setFragment({ "select" : $(this).attr('rel'), "query" : "cont:" + $(this).attr('rel') });
    //	  $('#query').val("cont:" + $(this).attr('rel'));
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
  });
  
  $('#nextpage').click(function(){
    var offset = parseInt($('#offset').val()) + offsetSteps;
    $.setFragment({ "offset" : offset });
    $('#offset').val(offset).change();
    $(document).trigger('requestData', true);
  });

  $('#datejump #nextdate').click(function() {
    $('#query').val($('#query').val().split(/:/)[0] + ":" + (parseInt($('#query').val().split(/:/)[1])+1));

    $('#queryform').trigger('submit');
  });
  $('#datejump #prevdate').click(function() {
    $('#query').val($('#query').val().split(/:/)[0] + ":" + (parseInt($('#query').val().split(/:/)[1])-1));
    $('#queryform').trigger('submit');
  });
  
  $.fragmentChange(true);
  $(document).bind("fragmentChange", function(e){
    $('#query').val($.fragment().query);
    $('#offset').val($.fragment().offset);
    $(document).trigger('requestData', false);
    //$('#queryform').trigger('submit');

  });
  if ($.fragment().query) {
    $('#query').val($.fragment().query);
    $('#offset').val($.fragment().offset);
    $(document).trigger('requestData', false);
  }
  
});

function processCountResponse(data) {
  cacheCount[$('#query').val()] = data;
  $('#count_time').html("Ct:"+(data['time']+'').substring(0,5));
  var key = lastSerialization;

  if (cacheLines[key]) {
    processResponse(cacheLines[key]);
  }	else {
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
  
  $('#sql').html(data['queries']);
  $('#results').html("");

  var params = $.fragment();
  var select = 0;

  if (params.select) {
    select = params.select;
  }

  if (!data['lines']) {
    alert("something went wrong");
  }

  for (var line in data['lines']) {
    line = data['lines'][line];

    var str = "";
    if (select == line.id) {
      str += "<strong>";
    }
    str += "<a href=\"#\" class=\"select\" rel=\""+line.id+"\">[" + line.at + "]</a>";

    linedata = $.link(line.data);

    switch (line.action) {
    case 'MESG':
      str += " &lt;" + nickStr(line) + "&gt; " + linedata + "<br />";
      break;
    case 'ACTI':
      str += " * " + nickStr(line) + " " + linedata + "<br />";
      break;
    case 'NICK':
      str += " <span style=\"color: #900;\">*** " + nickStr(line) + "</span> -NICK-> <span style=\"color: #0AC92B;\">" + linedata + "</span><br />";
      break;
    case 'TOPI':
      str += " ### " + nickStr(line) + " changed topic to '" + linedata + "'<br />";
      break;
    case 'JOIN':
      str += " <span style=\"color: #090;\">&gt;&gt;&gt; " + nickStr(line) + " has joined</span><br />";
      break;
    case 'QUIT':
      str += " <span style=\"color: #900;\">&lt;&lt;&lt; " + nickStr(line) + " has quit</span> (" + linedata + "<br />";
      break;
    default:
      str += " <span style=\"color: #900;\">*** " + nickStr(line) + " " + line.action + " : " + linedata + "</span><br />";
    }

    if (select == line.id)
      str += "</strong>";
    $('#results').append(str);

  }

  $('#results').append('<br/><br/>dt:' + data['time'] + 's');
  $('#result_time').html("Rt:" + (data['time'] + '').substring(0,5));
  
  offset = parseInt($('#offset').val());
  if (data['singleDate'] != 'yes') {
    $('#meta').html("Showing <strong>" + offset + " - " + (data['lines'].length+offset) + " of " + count + "</strong> lines");
    $('#datejump').hide();
  } else {
    $('#meta').html("Showing all " + count + " lines");
    $('datejump').show();
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
