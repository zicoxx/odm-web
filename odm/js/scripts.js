	window.onresize = function(event) {
		showMap();
	}

	function deleteDevice(id) {
		if (confirm("This will completely remove the device. Are you sure?")) {
			document.getElementById('device-dropdown').style.visibility = 'hidden';
			window.location.href = "delete.php?id="+id;
		}
	}

	function sendNotification(regId) {
		var message = prompt("Enter the notification to display.", "");
		if (message && message != "")
			sendPushNotification(regId, "Command:Notify:"+message);
		else
			toggleCommands();
	}

	function sendLockPass(regId) {
		var password = prompt("Enter the password to lock the device with.", "");
		if (password.length < 4) {
			alert("Password must be 4 or more characters.");
			toggleCommands();
		} else
			if (password && password != "")
				sendPushNotification(regId, "Command:LockPass:"+password);
			else
				toggleCommands();
	}


	function sendSMS(regId) {
		var message = prompt("Enter the phone number to receive the SMS.", "");
		if (message && message != "")
			sendPushNotification(regId, "Command:SMS:"+message);
		else
			toggleCommands();
	}

	function sendWipe(regId) {
		if (confirm("This will wipe ALL data, including external storage. Are you sure?")) {
			sendPushNotification(regId, "Command:Wipe");
		}
	}

	function sendPushNotification(regId, message) {
		toggleCommands();
		$.post( "send_message.php", { token: token, regId: regId, message: message } );
		if (message == "Command:GetLocation" || message == "Command:FrontPhoto" || message == "Command:RearPhoto") {
			waitingForResponse();
		} else {
			document.getElementById('command-sent-dropdown').style.visibility = 'visible';
			setTimeout( function () { 
					document.getElementById('command-sent-dropdown').style.visibility = 'hidden';
				}, 2000 // milliseconds delay
			);
		}
	}

	devvis = false;
	function toggleDevices() {
		if (devvis) {
			document.getElementById('device-dropdown').style.visibility = 'hidden';
			devvis = false;
		} else {
			document.getElementById('device-dropdown').style.visibility = 'visible';
			devvis = true;
		}
	}

	function selectDevice(id) {
		document.getElementById('device-dropdown').style.visibility = 'hidden';
		window.location.href = "?id="+id;
	}

	var cmdvis = false;
	function toggleCommands() {
		if (cmdvis) {
			document.getElementById('command-dropdown').style.visibility = 'hidden';
			cmdvis = false;
		} else {
			document.getElementById('command-dropdown').style.visibility = 'visible';
			cmdvis = true;
		}
	}

	function showMap() {
		var h = $(window).height();
		var w = $(window).width();
		var maphtml = '<iframe id="map_iframe" width="100%" height="'+(h-51)+'" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="'+iframe_src+'"></iframe>';
		document.getElementById("map_layer").innerHTML = maphtml;
		if (typeof(regId) !== 'undefined') {
			document.getElementById("curlocation-container").innerHTML = curlocation;
			document.getElementById("curlocation_mapped-container").innerHTML = curlocation_mapped;
		}
	}

	function daysBetween(first, second) {
		// Copy date parts of the timestamps, discarding the time parts.
		var one = new Date(first.getFullYear(), first.getMonth(), first.getDate());
		var two = new Date(second.getFullYear(), second.getMonth(), second.getDate());

		// Do the math.
		var millisecondsPerDay = 1000 * 60 * 60 * 24;
		var millisBetween = two.getTime() - one.getTime();
		var days = millisBetween / millisecondsPerDay;

		// Round down.
		return Math.floor(days);
	}

	function checkUpdate() {
		$.get("checkversion.php", function(data) {
			if (data == "true") {
				alert('There is a new version of ODM-Web available. Download from: https://github.com/Fmstrat/odm-web/archive/master.zip');
			}
		});
	}

	function init() {
		loadMessages();
		if (check_for_new_versions)
			checkUpdate();
	}

	function loadMessages() {
		if (typeof(regId) !== 'undefined') {
			var url = 'messages.php?n=30&regId=' + regId;
			$.get(url, gotMessages);
			document.getElementById("button").style.visibility = 'visible';
		} else {
			showMap();
		}
	}

	function loadPrevMap(i) {
		buildMap(i, "Previously");
	}

	function buildMap(i, s) {
		if (!s)
			s = "Last"
		var t = messages[i].created_at.split(/[- :]/);
		var d = new Date(t[0], t[1]-1, t[2], t[3], t[4], t[5]);
		var today = new Date();
		var h = d.getHours();
		var ap = "AM";
		if (h > 12) {
			h = h-12;
			ap = "PM";
		}
		var m = d.getMinutes();
		if (m < 10)
			m = "0"+m.toString();
		var day = d.getDate();
		var month = d.getMonth();
		var year = d.getFullYear();
		if (daysBetween(d, today) == 0) {
			curlocation = s+" located <b>today</b> at <b>"+h+":"+m+" "+ap;
		} else {
			curlocation = s+" located on <b>"+(month+1)+"/"+day+"/"+year+"</b> at <b>"+h+":"+m+" "+ap;
		}
		var coords = messages[i].message.split(" ");
		curlocation_mapped = "Lat:"+coords[1]+" Lng:"+coords[2];
		// Change t=m to t=h for sattelite
		var new_iframe_src = "https://maps.google.com/maps?q="+coords[1]+","+coords[2]+"&amp;ie=UTF8&amp;t=m&amp;z=14&amp;ll="+coords[1]+","+coords[2]+"&amp;z=18&amp;output=embed";
		if (new_iframe_src != iframe_src) {
			iframe_src = new_iframe_src;
			showMap();
		}
	}

	var messages;
	var curlocation;
	var curlocation_mapped;
	function gotMessages(data) {
		messages = $.parseJSON(data);
		var log = "";
		curlocation = "Location Unavailable";
		curlocation_mapped = "The location of this device has not been mapped.";
		for (var i = 0; i < messages.length; i++) {
			if (i > 0)
				log += "<br>";
			log += "<b>"+messages[i].created_at+":</b> ";
			if (messages[i].message.substring(0, 10) == "Location: ") {
				var tmp_link = "<span class='loglink' onclick='loadPrevMap("+i+")'>Location</span>";
				log += messages[i].message.replace("Location",tmp_link);
			} else if (messages[i].message.substring(0, 4) == "img:") {
				var tmp_link = "<span class='loglink' onclick='showImg("+i+")'>Image</span>: ";
				log += messages[i].message.replace("img:",tmp_link);
			} else {
				log += messages[i].message;
			}
			if (messages[i].message.substring(0, 10) == "Location: " && curlocation == "Location Unavailable") {
				buildMap(i);
			}
		}
		if (log == "") {
			log = "No messages received.";
			showMap();
		} else if (messages[0].message.substring(0, 4) == "img:" && waitvis) {
			// The first message is an image, so display it
			showImg(0);
		} else {
			showMap();
		}
		toggleWaitOff();
		document.getElementById("log-contents").innerHTML = log;
	}

	function showImg(i) {
		var h = $(window).height();
		var w = $(window).width();
		var url = 'img.php?w='+(w-300)+'&h='+(h-150)+'&id=' + messages[i].id;
		$.get(url, gotImg);
	}

	function gotImg(data) {
		document.getElementById('img-container').innerHTML = "<div class='img-display' onclick='hideImg()'>Click to close</div><div class='img-display' onclick='hideImg()'>"+data+"</div>";
		document.getElementById('img-container').style.visibility = 'visible';
	}

	function hideImg() {
		document.getElementById('img-container').style.visibility = 'hidden';
		document.getElementById('img-container').innerHTML = "";
	}

	var waitvis = false;
	function toggleWait() {
		if (waitvis) {
			document.getElementById('command-wait-dropdown').style.visibility = 'hidden';
			waitvis = false;
		} else {
			document.getElementById('command-wait-dropdown').style.visibility = 'visible';
			waitvis = true;
		}
	}
	
	function toggleWaitOff() {
		if (waitvis) {
			document.getElementById('command-wait-dropdown').style.visibility = 'hidden';
			waitvis = false;
		}
	}

	function checkForNewMessage(data) {
		if (waitvis) {
			if (data && data != "" && data != "[]") {
				tmpmessages = $.parseJSON(data);
				if ($.isEmptyObject(messages) || messages[0].created_at != tmpmessages[0].created_at) {
					loadMessages();
				} else {
					waitTimer();
				}
			} else {
				waitTimer();
			}
		}
	}

	function waitTimer() {
		if (waitvis) {
			setTimeout( function () { 
					var url = 'messages.php?n=1&regId=' + regId;
					$.get(url, checkForNewMessage);
				}, 5000 // milliseconds delay
			);
		}
	}

	function waitingForResponse() {
		toggleWait();
		waitTimer();
	}

	function cancelWait() {
		toggleWait();
	}
