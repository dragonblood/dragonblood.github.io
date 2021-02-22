$('.open-overlay').click(function() {
	var overlay_navigation = $('.overlay-navigation'),
	  nav_item_1 = $('navo li:nth-of-type(1)'),
	  nav_item_2 = $('navo li:nth-of-type(2)'),
	  nav_item_3 = $('navo li:nth-of-type(3)'),
	  nav_item_4 = $('navo li:nth-of-type(4)'),
	  nav_item_5 = $('navo li:nth-of-type(5)'),
	  top_bar = $('.bar-top'),
	  middle_bar = $('.bar-middle'),
	  bottom_bar = $('.bar-bottom');
  
	overlay_navigation.toggleClass('overlay-active');
	if (overlay_navigation.hasClass('overlay-active')) {
  
	  top_bar.removeClass('animate-out-top-bar').addClass('animate-top-bar');
	  middle_bar.removeClass('animate-out-middle-bar').addClass('animate-middle-bar');
	  bottom_bar.removeClass('animate-out-bottom-bar').addClass('animate-bottom-bar');
	  overlay_navigation.removeClass('overlay-slide-up').addClass('overlay-slide-down')
	  nav_item_1.removeClass('slide-in-nav-item-reverse').addClass('slide-in-nav-item');
	  nav_item_2.removeClass('slide-in-nav-item-delay-1-reverse').addClass('slide-in-nav-item-delay-1');
	  nav_item_3.removeClass('slide-in-nav-item-delay-2-reverse').addClass('slide-in-nav-item-delay-2');
	  nav_item_4.removeClass('slide-in-nav-item-delay-3-reverse').addClass('slide-in-nav-item-delay-3');
	  nav_item_5.removeClass('slide-in-nav-item-delay-4-reverse').addClass('slide-in-nav-item-delay-4');
	} else {
	  top_bar.removeClass('animate-top-bar').addClass('animate-out-top-bar');
	  middle_bar.removeClass('animate-middle-bar').addClass('animate-out-middle-bar');
	  bottom_bar.removeClass('animate-bottom-bar').addClass('animate-out-bottom-bar');
	  overlay_navigation.removeClass('overlay-slide-down').addClass('overlay-slide-up')
	  nav_item_1.removeClass('slide-in-nav-item').addClass('slide-in-nav-item-reverse');
	  nav_item_2.removeClass('slide-in-nav-item-delay-1').addClass('slide-in-nav-item-delay-1-reverse');
	  nav_item_3.removeClass('slide-in-nav-item-delay-2').addClass('slide-in-nav-item-delay-2-reverse');
	  nav_item_4.removeClass('slide-in-nav-item-delay-3').addClass('slide-in-nav-item-delay-3-reverse');
	  nav_item_5.removeClass('slide-in-nav-item-delay-4').addClass('slide-in-nav-item-delay-4-reverse');
	}
  });

// attaching scroll event on windows object
$(window).on("scroll",function(){
	// getting positions of scroll and elements
	var scrollHeight = Math.ceil(window.pageYOffset);
	var achivementsPos = $("#achivements").offset().top - 300;
	var CommunitySecPos = $("#community").offset().top - 200;
	var recipeSection =  $("#recipe").offset().top - 200
	var contactUsSection = $("#contact-login").offset().top - 600;
	var incre = achivementsPos + 400;
	// if scrollheight is less then previuos element call movenumb function to move number
	if(scrollHeight < CommunitySecPos){
		moveNum("-8","01",0);
	}
	// this if condition is checking for scroll heigth to match element position
	// so elements can move accordingly
	if(scrollHeight >= CommunitySecPos && scrollHeight < achivementsPos){
		communitySectionMove("#media-tweet",100);
		communitySectionMove("#media-tweet2",110);
		communitySectionMove("#media-tweet3",120);
		communitySectionMove("#dummy",150);
		moveNum(16,"02",1);
	
	}
	else{
		communitySectionMove("#media-tweet",300);
		communitySectionMove("#media-tweet2",310);
		communitySectionMove("#media-tweet3",360);
		communitySectionMove("#dummy",410);
	}
	if(scrollHeight >= achivementsPos && scrollHeight < incre){
		// calling animate function to move list elements
		animateList("#starters ul","100px");
		animateList("#main-courses ul","200px");
		animateList("#sides ul","190px");
		animateList("#desserts ul","130px");

		moveNum(64,"03",3)

	}else{

		animateList("#starters ul","800px");
		animateList("#main-courses ul","-500px");
		animateList("#sides ul","800px");
		animateList("#desserts ul","-600px");

	}
	if(scrollHeight >= recipeSection && scrollHeight){
		moveNum(88,"04",4)
	}
	if(scrollHeight >= contactUsSection){
		moveNum(110,"05",5);
	}
	// this function is moving the achivements elements up and down according to the scroll position
	function animateList(id,distance){
		$(id).stop().animate({
			"top" : distance
		},1500);
	}
	// this function is moving the page number up and down
	function moveNum(distance,number,index){
		$("#count").text(number);
		$("#count").stop().animate({
			top : distance
		},1000,function(){
	
			var pageCountShow = $(".pageCountShow");
			$(".active").stop().animate({
				"width" : "18px"
			})
			$(".active").removeClass("active");
			pageCountShow.eq(index).stop().animate({
				"width" : "42px"
			},500).addClass("active");

		});
	
	}
	function communitySectionMove(id,distance){
		$(id).stop().animate({
			"top" : distance
		},1000)
	}
	// attaching click event on nav links so body can scroll to that link element
	$(".links").on("click",function(e){
		e.preventDefault();
		var target = e.target;
		var id = target.hash; // getting id from hash link
	 	$("html, body").stop().animate({
	 		scrollTop : $(id).offset().top - 30
	 	},1000,function(){
	 		window.location.hash = id // setting window location hash to id var
	 	})

	})
	
});