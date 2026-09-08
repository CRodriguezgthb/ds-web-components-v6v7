// Change image banner in the section ctas buttons and reset styles for smaller views
$(document).ready(function () {
  if ($(window).width() < 1200) {
    $(".need-link").each(function () {
      if ($(this).hasClass("active")) {
        $(this).removeClass("active");
      }
    });
  }
  $(".need-link").on("mouseenter mouseleave", function (event) {
    var needLink = $(this);
    if (event.type == "mouseenter") {
      if ($(window).width() >= 1200) {
        $(".need-link").each(function () {
          if ($(this).hasClass("active")) {
            $(this).removeClass("active");
            $(
              "#need-image-container #" + $(this).attr("id") + "-img",
            ).removeClass("active");
          }
        });
      }
      needLink.addClass("active");
      $("#need-image-container #" + needLink.attr("id") + "-img").addClass(
        "active",
      );
    }
    if (event.type == "mouseleave") {
      if ($(window).width() < 1200) {
        needLink.removeClass("active");
      }
    }
  });
});