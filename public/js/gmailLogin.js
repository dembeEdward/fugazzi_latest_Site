function onSignIn(googleUser) {
  		
  	var profile = googleUser.getBasicProfile();
  	console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
  	console.log('Name: ' + profile.getName());
  	console.log('Image URL: ' + profile.getImageUrl());
  	console.log('Email: ' + profile.getEmail());

  	email = profile.getEmail();
  	window.open("/homepage.html", "_self");
  	console.log(email);
}