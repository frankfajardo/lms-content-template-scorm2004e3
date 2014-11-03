//---------------------------------------------------------------------------------------------
//  Author: Frank Fajardo (frank.fajardo@pearson.com)
//---------------------------------------------------------------------------------------------

var scorm, SB; // SCORM_API and SCOBot

var scoPlayer = scoPlayer || {};


(function () {

    //------------------------------------------------------------------------------------------------
    //  Public Properties and Methods
    //------------------------------------------------------------------------------------------------

    this.version = '1.0.0';

    this.showDialog = showDialog;

    // Expose functions related to the quiz.
    this.loadQuiz = loadQuiz;
    this.startQuiz = startQuiz;
    this.endQuiz = endQuiz;

    // Note: 
    // In some cases where this SCO is launched in an iframe, exit() may not be triggered if the window is closed.
    // So exit() should NOT do anything critical to the status of the SCO.
    this.exit = stopPlayer;

    this.stopping = false;

    this.playFullContent = function () { return $('body').hasClass('sco-player'); };
    this.playContentFromBeginning = playContentFromBeginning;
    this.playContentFromBookmarkedPage = playContentFromBookmarkedPage;

    this.initialiseAccordions = initialiseAccordions;
    this.accordionCollapseAll = accordionCollapseAll;
    this.accordionExpandAll = accordionExpandAll;


    //------------------------------------------------------------------------------------------------
    //  Internal variables and functions
    //------------------------------------------------------------------------------------------------

    var contentHeading;
    var contentPages;

    var totalPages = 0;
    var currentPage = 0, bookmarkedPage = 0; // zero-based 
    var completedPages; // array of page numbers (int). 

    // jQuery objects that refer to element containing the quiz, and children elements containing the quiz questions and result.
    // Do not rely on these unless a quiz is active.
    var qzContent, qzQuestions, qzResult;

    var totalQuestions = 0, correctAnswers = 0, missingAnswers = 0;
    var currentQuestion = 0, targetQuestion; // zero-based

    var scoModeIsNormal = true; 
    var scoIsRunForCredit = true;
    var scoSuspend = true;


    var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var QUIZNAVS = '<div class="content-wrapper sco-quiz-nav">' +
                       '<div id="nav-grp-counters" class="nav-container">' +
                            '<div id="question-counter" class="nav-quiz counter-panel">' +
                                 '<div id="current-question" class="current-count" class="Current question number"></div>' +
                                 '<div id="total-questions" class="max-count" title="Total number of questions"></div>' +
                            '</div>' +
                        '</div>' +
                        '<div id="nav-grp-steppers" class="nav-container">' +
                             '<div class="nav-btn nav-quiz nav-prev" title="Previous Question"><i class="fa fa-chevron-left"></i></div>' +
                             '<div class="nav-btn nav-quiz nav-next" title="Next Question"><i class="fa fa-chevron-right"></i></div>' +
                        '</div>' +
                        '<div id="nav-grp-exit" class="nav-container">' +
                            '<div class="nav-btn nav-quiz nav-exit" title="End Quiz"><i class="fa fa-sign-out"></i></div>' +
                        '</div>' +
                    '</div>';

    var allContentPagesLoaded = false;

    //----------------------------------------------------------------
    // On ready function
    //----------------------------------------------------------------
    $(document).ready(function () {

        initialiseScormApi();

        if (scoPlayer.playFullContent()) {
            initialiseForFullContentPlay();
        }
        else {
            initialiseForPageContentPlay();
        }

        setEventListeners();
        
    })


    // This initialises communication with the SCORM API and SCOBot.
    function initialiseScormApi() {

        // Initialise SCORM API
        if (typeof window['SCORM_API'] === "function") {
            scorm = new SCORM_API({
                debug:             true,
                throw_alerts:      true,
                time_type:         'GMT'
            });
        }

        // Initialise SCOBot and hook some functions.
        if (typeof window['SCOBot'] === "function") {
            SB = new SCOBot({
                success_status:        "unknown",
                completion_threshold:  1.0
            });
            $(SB).on('load', function (e) {
                startPlayer();
            });
            $(SB).on('unload', function (e) {
                stopPlayer();
            });
            $(SB).on('comments_lms', function(e) {
                //e.data will return {Array} of {Object(s)}
            });
            $(SB).on('exception', function (e) {
                // Do something to notify the student there was a exception (SCORM Failure)
                // This is thrown when the LMS becomes unresponsive or not compliant with SCORM 2004.  Data loss is possible.
                return false;
            });
        }
        
    }

    // This initialises the player for a full content play.
    function initialiseForFullContentPlay() {

        $('#nojs-notice').hide(); // Hide notice about turning on javascripting.

        $('#cover').show(); // Show cover image
        $("#toc").hide(); // Hide table of contents.
        $('#main-content').hide(); // Hide main content area.
        
        $(".nav-page").hide();
        $(".nav-quiz").hide();
        $("#nav-grp-help").hide();
        $("#nav-grp-exit>.nav-page").show();

        // Load content pages
        // NOTE: Some browsers will not allow this command to run locally.
        //       I use WebMatrix to "Start" the site from a folder. 
        //       It uses IISExpress to host the site and serve all content including the json file.
        $.getJSON( "sco-content.json", function( content ) {
            contentHeading = content.heading;
            document.title = contentHeading;
            contentPages = content.pages;
            loadAllPages(content);
        });
      
    }

    // This initialises the player for a page content display.
    function initialiseForPageContentPlay() {

        // Remove H1 heading, if existing. Then add with specific class.
        if ($('h1').length > 0) {
            $('h1').remove();
        }
        $('.page-content').prepend('<h1 class="course-heading">[Course Heading will be taken from sco-content.json]</h1');

        // Add navigation buttons for the quiz
        if ($('.page-content').hasClass('quiz-content') == true) {
            $('body').prepend('<div class="webbar"/>')
            $('.webbar').prepend(QUIZNAVS);
            $('.webbar').hide();
        }

        // Run function required before showing the page content.
        var pageObj = $('.page-content').parent('.page-wrapper');
        runPageFuncBeforeShow(pageObj);
 
    }


    // This registers general event handlers
    function setEventListeners() {

        // Register resize event handler
	    if (window.addEventListener) {
            window.addEventListener('resize', resizePage, false); 
	    } 
        else if (window.attachEvent) { 
            window.attachEvent('onresize', resizePage, false); 
	    }    

        // Handle clicks on the navigation buttons
        $('.nav-btn').click(function (e) {
            handleNavClick($(this));
            e.stopPropagation();
        })
       
        // Handle clicks on 'Table of Content' items
        $('#toc').on('click', '.toc-item', function () {
            gotoContent($(this));
        })

        // Handle clicks events for the Help Guide
        $('#master-detail').on('click', '.help-next', function () {
            nextHelp();            
        })
        $('#master-detail').on('click', '.help-prev', function () {
            prevHelp();            
        })
        $('#master-detail').on('click', '.help-exit', function () {
            hideHelp();
        })

        // Handle clicks on page elements that require interactions.
        $('body').on('click', '.must-be-clicked', function () {
            handleInteractionFor($(this));
        })

        // Handle clicks on question choices.
        $('body').on('click', '.q-choice', function (e) {
            noteChoice($(this));
            e.stopPropagation();
        })    
        
        // Handle clicks events for 'Read more' (and its counterpart 'Read Less')
        $('body').on('click', '.read-more', function (e) {
            readMoreOrLessOf($(this));
            e.stopPropagation();
        })     
        
        // Reset accordion elements, if any.
        initialiseAccordions();     

    }

    // Starts playing the content
    function startPlayer() {

        // Ensure all pages have been loaded before starting content. Wait a bit more if not.
        if (!allContentPagesLoaded) {
            setTimeout(function () {
                startPlayer();
            }, 500);
            return;
        }

        // Initialise SCORM data.
        if (typeof SB !== 'undefined') {
            var modeVal = SB.getValue('cmi.mode');
            var creditVal = SB.getValue('cmi.credit');
            scoModeIsNormal = (modeVal === 'normal');
            scoIsRunForCredit = (creditVal === 'credit') || (scorm.isLMSConnected() === false);
            if (scoModeIsNormal) {
                bookmarkedPage = getScoBookmark();
                completedPages = getScoCompletedPages();
                if (bookmarkedPage > 0 && bookmarkedPage < totalPages) {
                    var htmlMsg = '<h3>Resume your last session?</h3>' +
                                  '<p>Click <em>Yes</em> to resume. Or click <em>No</em> to start from the beginning.</p>'
                    showDialog(htmlMsg, 
                                ["*Yes","No"], 
                                [function () {
                                    scoPlayer.playContentFromBookmarkedPage();
                                }, 
                                 function () {
                                    scoPlayer.playContentFromBeginning();
                                }]);
                    return;
                }
            }
        }
        playContentFromBeginning();
    }

    function playContentFromBeginning() {
        resetScoProgress();
        startContentAtPage(0);
    }

    function playContentFromBookmarkedPage() {
        runCompletedPagesFunc(completedPages);
        startContentAtPage(bookmarkedPage);
    }

    // Stop player
    function stopPlayer() {

        // Avoid re-doing
        if (this.stopping === true) return;
        this.stopping = true;

        // Hide main body and show good bye message.
        $('#master-body').hide();
        $('#good-bye span').text('Good bye!');
        $('#good-bye').removeClass('hidden');

        if (SB !== 'undefined') {
            if (scoSuspend) {
                SB.suspend();
            }
            else {
                SB.finish();
            }
        }

    }

    // This resets teh SCO progress info
    function resetScoProgress() {
        if ((typeof SB !== 'undefined') && scoModeIsNormal && scoIsRunForCredit) {
            // Set default ratings at the beginning. These should eventually be overwritten when the course has a quiz.
            SB.setValue('cmi.progress_measure', '0');
            SB.setValue('cmi.score.raw', '0');
            SB.setValue('cmi.score.min', '0');
            SB.setValue('cmi.score.max', '100');
            SB.setValue('cmi.score.scaled', '0');
            // Clear any bookmark and suspend_data.
            SB.setValue('cmi.location', '');
            SB.setValue('cmi.suspend_data', '');
            SB.setValue('cmi.success_status', 'unknown');
        }
    }

    // Runs the function required before showing a page content.
    function runPageFuncBeforeShow(pageObj) {
        // The .page-content class would have a data-sco-beforeshow attribute which names the function to run.
        if (pageObj instanceof jQuery && pageObj.length === 1) {
            var pageFuncBeforeShow = pageObj.children('.page-content:eq(0)').attr('data-sco-beforeshow');
            if (typeof window[pageFuncBeforeShow] === "function") {
                window[pageFuncBeforeShow]();
            }
        }
    }

    // Runs completion steps for each page marked as completed. This is run when a previous SCO session is resumed.
    function runCompletedPagesFunc(completedPages) {
        if (completedPages instanceof Array) {
            for(i = 0; i < completedPages.length; i++) {
                var j = parseInt(completedPages[i], 10);
                if (!isNaN(j) && j > -1 && j < totalPages) {
                    var pageClass = $('.toc-item:eq(' + j + ')').attr('data-target');
                    var pageObj = $("." + pageClass);
                    pageObj.find('.must-be-clicked').removeClass('must-be-clicked');
                    runPageCompletionFunc(pageObj);
                }
            }
        }
    }

    // Runs the relevant function for a page content once interactions in that page have all been completed by the user.
    function runPageCompletionFunc(pageObj) {
        if (pageObj instanceof jQuery && pageObj.length === 1) {

            // If there is a function to run after all interactions are complete, run it.
            var pageFuncAfterInteractions = pageObj.children('.page-content').attr('data-sco-aftercompletion');
            if (typeof window[pageFuncAfterInteractions] === "function") {
                window[pageFuncAfterInteractions]();
            }

            // If there are instruction elements related to interactions, hide them (as they would have all been done).
            pageObj.find('.instruction.for-interaction').hide();

            // Mark the corresponding TOC item for this content as complete.
            if (scoPlayer.playFullContent()) {
                var i = $('#main-content .page').index(pageObj);
                $('.toc-item:eq(' + i + ')').addClass('completed');
            }
        }
    }

    // Sets the SCO to suspend by default if the player is stopped before the content is completed
    function initialiseScoExitOption() {
        if ((typeof SB !== 'undefined') && scoModeIsNormal) {
            // Set exit mode to 'suspend' by default.
            SB.setValue('cmi.exit', 'suspend');
            scoSuspend = true;
        }
    }

    // Handle click events for all navigational buttons
    function handleNavClick(elem, event) {

        // Do nothing if button is disabled.
        if (elem.hasClass('disabled') === true) {
            if (elem.hasClass('nav-next') === true) {
                if (currentPage < totalPages - 1) {
                    showDialog('<h3>The <em>Next</em> button is disabled.</h3><p>Please see instructions on the page to continue.</p>', 
                                "*Ok", 
                                null);
                }
            }
            return;
        }
        // Do nothing if button is being shown in the help guide.
        if (elem.closest('.nav-container').hasClass('help-focus') === true) {
            if (elem.hasClass('nav-toc') === false) {
                return;
            }
        }

        // Exit
        if (elem.hasClass('nav-exit') === true) {
            //if (elem.hasClass('nav-page') === true) {
            //    stopPlayer();
            //}
            if (elem.hasClass('nav-quiz') === true) {
                endQuiz();
            }
            return;
        }

        // Previous
        if (elem.hasClass('nav-prev') === true) {
            if (elem.hasClass('nav-page') === true) {
                if (currentPage > 0) {
                    showPage(currentPage - 1);
                }
            }
            if (elem.hasClass('nav-quiz') === true) {
                if (currentQuestion > 0) {
                    showQuestion(currentQuestion - 1);
                }
            }
            return;
        }

        // Next
        if (elem.hasClass('nav-next') === true) {
            if (elem.hasClass('nav-page') === true) {
                if (currentPage < totalPages - 1) {
                    showPage(currentPage + 1);
                }
            }
            if (elem.hasClass('nav-quiz') === true) {
                if (currentQuestion < totalQuestions - 1) {
                    showQuestion(currentQuestion + 1);
                } 
                //else {
                //    endQuiz();
                //}
            }
            return;
        }

        // Help
        if (elem.hasClass('nav-help') === true) {
            if (elem.hasClass('active') === false) {
                elem.addClass('active');
                showHelp();
            }
            return;
        }

        // Contents Menu
        if (elem.hasClass('nav-toc') === true) {
            if (elem.hasClass('active') === false) {
                showTOC();
            }
            else {
                hideTOC();
            }
            return;
        }
    }

    // Handles clicks on an element that .must-be-clicked 
    function handleInteractionFor(elem) {
        if (elem instanceof jQuery && elem.length === 1) {
            elem.removeClass('must-be-clicked');
            
            // If there are no more interactions on this page, mark as complete. And enable 'Next' button.
            var pageObj = elem.closest('.page-wrapper');
            if (pageObj.find('.must-be-clicked').length === 0) {
                runPageCompletionFunc(pageObj);
                enableNav('.nav-page.nav-next'); // Enable Next button
            }
        }
    }


    // Functions to take care of enabling/disabling the nav buttons
    // The nav buttons use FontAwesome which has problems rendering on IE8
    // at runtime (during class changes). So these two functions forces
    // IE8 to redraw the relevant buttons.
    function enableNav(selector) {
        $(selector).removeClass('disabled');
        redrawPseudos(selector);
    }
    function disableNav(selector) {
        $(selector).addClass('disabled');
        redrawPseudos(selector);
    }
    function activateNav(selector) {
        $(selector).addClass('active');
        redrawPseudos(selector);
    }
    function deactivateNav(selector) {
        $(selector).removeClass('active');
        redrawPseudos(selector);
    }

    // Show Table of Contents
    function showTOC() {
        activateNav('.nav-toc');
        $("#toc").addClass('active').show();
        relocateTOC();        
    }

    // Hide Table of Contents
    function hideTOC() {
        deactivateNav('.nav-toc');
        $("#toc").fadeOut(200).removeClass('active');
    }

    // Decides on whether to hide TOC depending on screen width.
    function autoHideTOC(viewWidth, contentWidth) {
        // If narrow window, auto-hide TOC.
        var w = Math.floor((viewWidth - contentWidth) / 2); // Check available width on the left of the content.
        var x = $("#toc").width() + 10; // Check width of TOC.
        if (w < x) {
            hideTOC(); // Hide if available with is narrower.
        }
    }

    // Go to content pointed to by a item in the Table of Contents
    function gotoContent(tocItem) {
        // Do nothing if the toc item is actually already being shown, or if help is active (and therefore TOC is read only).
        if (tocItem.hasClass('current') === false && tocItem.closest('#toc').hasClass('help-focus') === false) {
            // The 'data-target' attribue of the toc item defines the target page number.
            var target = tocItem.attr('data-target');
            if (target.indexOf('page-') > -1) {
                var pageNbr = target.substr(5);
                if (parseInt(pageNbr, 10) || pageNbr == 0) {
                    var targetPage = parseInt(pageNbr, 10);
                    showPage(targetPage);
                }
            }
        }
    }

    // Shows a dialog message with optional buttons. This also allows you to pass functions to run when user clicks the buttons.
    // Primary buttons (highlighted) can be marked by an asterisk at the beginning of the button text: e.g. "*Proceed".
    // All buttons will close the dialog when clicked. So if a button's role is just to close the dialog, pass 'null' on the corresponding function.
    function showDialog(htmlMsg, btnTexts, btnFuncs) {
        
        // Number of button text must match number of functions provided.
        if (btnTexts instanceof Array || btnFuncs instanceof Array) {
            if (btnTexts.length != btnFuncs.length) return;
        }

        setDialogContent(htmlMsg);

        var btnCount = (btnTexts instanceof Array) ? btnTexts.length : 1;

        $('#dialog-buttons').html('');
        for(i=0; i < btnCount; i++) {
            var fName = (btnFuncs instanceof Array) ? btnFuncs[i] : btnFuncs;
            fName = (fName !== null) ? $.trim(fName) : null;
            var bText = (btnTexts instanceof Array) ? $.trim(btnTexts[i]) : $.trim(btnTexts);
            var bClas = 'btn';
            // An asterisk at the beginning of the text indicates it is a primary button.
            if (bText.indexOf('*') == 0) {
                bClas += ' btn-primary'
                bText = bText.substr(1);
            }
            if (btnFuncs == null || btnFuncs[i] === null) {
                $('#dialog-buttons').append('<span class="' + bClas + '">' + bText + '</span>');
            }
            else {
                $('#dialog-buttons').append('<span class="' + bClas + '" onclick="f=' + fName + ';f()">' + bText + '</span>');
            }
        }

        showTopOfPage();
        $('.dimmer').show(); // Activate dimmers

        var w = ($(window).width * 0.95 < $('#dialog').width) ? $(window).width * 0.95 : $('#dialog').width;
        $('#dialog').css({'width':w}).show();

    }

    // Sets the content of the dialog. 
    // It also adds the dialog container if it does not exist, and hooks up the closeDialog() to the buttons.
    function setDialogContent(htmlContent) {

        // Add #dialog div to the body if not already existing.
        if ($('#dialog').length === 0) {
            $('body').append('<div id="dialog"><div id="dialog-content"></div><div id="dialog-buttons"></div></div>');
            $('#dialog-buttons').on('click', '.btn', function (e) {
                closeDialog();
                e.stopPropagation();
            })
        }
        
        $('#dialog-content').html(htmlContent);
    }

    // Closes the dialog popup.
    function closeDialog() {
        $('#dialog').hide();
        $('.dimmer').hide();
        $('#dialog-content').html(''); // Clears content
        $('#dialog-buttons').html(''); // Removes buttons
    }

    // Show help guide.
    function showHelp() {
        $('.dimmer').show(); // Dim content.
        $('#help-guide .help-section').hide();
        $('#help-guide').show().children('.help-section:eq(0)').addClass('active').fadeIn(200);
        showHelpBtn();
    }

    // Hide help guide.
    function hideHelp() {
        $('.help-focus').removeClass('help-focus'); // Remove focus on any element on the player during help tour.
        $('.click-shield').remove(); // Remove shield added to page content, if any.
        $('.dimmer').hide(); // Remove content dimmer.
        $('#help-guide').hide().children('.help-section.active').removeClass('active').hide(); // Hide help guide
        $('.nav-help').removeClass('active'); // Help is no longer active.
    }

    // Show previous help section.
    function prevHelp() {
        showHelpSection(-1);
    }

    // Show next help section.
    function nextHelp() {
        showHelpSection(+1);
    }

    // Steps back or forward through help guide.
    function showHelpSection(step) {
        if (step == 0) return;
        
        // Get all help pages/sections, and get the active one, if any.
        // Determine next help page/section to activate.
        var helpPages = $('#help-guide .help-section');
        var activeHelpPage = $('#help-guide .help-section.active');
        var i = 0;
        if (activeHelpPage.length > 0) {
            activeHelpPage.removeClass('active').hide()
            i = helpPages.index(activeHelpPage[0]) + step;
        }

        // Get next help page to activate. Set focus based on what that help page is for.
        activeHelpPage = $('#help-guide .help-section:eq(' + i + ')');
        if (activeHelpPage.length > 0) {

            $('.help-focus').removeClass('help-focus'); // Remove previous focus.
            activeHelpPage.addClass('active').fadeIn(200); // Show next help page.

            // Set focus on player elements depending on the help section currently active.
            if (activeHelpPage.hasClass('help-with-content') === true) {
                $('.page.current').addClass('help-focus');
                // Add a "shield" (a DIV over the page) to stop click events on the page. 
                if ($('.page.current .click-shield').length === 0) {
                    $('.page.current').append('<div class="click-shield"></div>');
                }
            }
            else if (activeHelpPage.hasClass('help-welcome') === true) {
                $('#nav-grp-help').addClass('help-focus');
            }
            else if (activeHelpPage.hasClass('help-with-toc') === true) {
                $('#nav-grp-toc').addClass('help-focus');
                $('#toc').addClass('help-focus');
            }
            else if (activeHelpPage.hasClass('help-with-steppers') === true) {
                $('#nav-grp-steppers').addClass('help-focus');
            }
            else if (activeHelpPage.hasClass('help-with-counters') === true) {
                $('#nav-grp-counters').addClass('help-focus');
            }
            else if (activeHelpPage.hasClass('help-with-exit-or-submit') === true) {
                $('#nav-grp-exit').addClass('help-focus');
            }
            showHelpBtn();
        }
    }

    // Enable/disable help buttons based on current section being displayed
    function showHelpBtn() {
        var helpPages = $('.help-section');
        var hTotal = helpPages.length;
        var activeHelpPage = $('.help-section.active');
        var hIndex = helpPages.index(activeHelpPage);
        if (hIndex == 0) {
            $('.help-prev').addClass('hidden');
        }
        else {
            $('.help-prev').removeClass('hidden');
        }

        if (hIndex == hTotal - 1) {
            $('.help-next').addClass('hidden');
        }
        else {
            $('.help-next').removeClass('hidden');
        }
    }

    // Change position of TOC. This is called when TOC is visible, or when window is resized whilst TOC is visible.
    function relocateTOC() {
        if ($("#toc").hasClass('active') === true) {
            var w = Math.floor(($(window).width() - $("#master-detail>.content-wrapper").width()) / 2);
            var x = $("#toc").width() + 10;
            if (w <= 0) {
                $("#toc").css({'left':'0'})
                return;
            }
            if (w > 0 && w < x) {
                $("#toc").css({'left':'-'+w+'px'})
            }
            else {
                $("#toc").css({'left':'-'+x+'px'})
            }
        }
    }

    // Load all pages
    function loadAllPages() {

        if (typeof contentPages !== 'undefined') {
            disableNav('.nav-btn'); // Disable nav buttons for now in case user clicks one.
            $("#main-content").html(''); // Clear main-content

            totalPages = contentPages.length;
            for (var i = 0; i < totalPages; i++) {

                // Append page to table of contents
                $("#toc>.dimmer").before('<div class="toc-item" data-target="' + uniquePageClass(i) + '">' + contentPages[i].title + '</div>');

                // Append page to the main content area.
                $("#main-content").append('<div class="page ' + uniquePageClass(i) + ' page-wrapper"></div>');
                var containerSelector = "."+uniquePageClass(i);
                var fullpath = contentPages[i].location;
                loadPage(containerSelector, fullpath);
            }

            allContentPagesLoaded = true;
        }
    }

    // Load a page given a path and it destination div ID.
    function loadPage(containerSelector, fullpath) {
        $.get(fullpath, function (data) {
            var pageContent = $(".page-content:eq(0)", data).prepend('<div class="course-heading">' + contentHeading + '</div>');
            var pageContainer = $(containerSelector);
            if (pageContainer.length === 0) return;
            pageContainer.html(pageContent).hide();
        });
    }

    // Returns text in format 'page-N'
    function uniquePageClass(pageNbr) {
        return "page-" + pageNbr.toString();
    }

    // This function starts playing the content at the given starting page.
    function startContentAtPage(startPage) {
        
        initialiseScoExitOption();

        var targetPage = (startPage > 0 && startPage < totalPages) ? startPage : 0;
        setTimeout(function () {
            $('#cover').fadeOut(500, 
                function() {
                    enableNav('.nav-btn');
                    $("#main-content").show();
                    showPage(targetPage);
                    $(".nav-page").show();
                    $("#nav-grp-help").show();
            });                   
        },2500);
    }

    // Shows a page content by the (zero-based) page number, and updates the counter.
    function showPage(pageNbr) {
        var pageClass = uniquePageClass(pageNbr);
        var pageObj = $("." + pageClass + ":eq(0)");
        if (pageObj.length > 0) {
    
            // If narrow window, auto-hide TOC.
            autoHideTOC(pageObj.closest('body').width(), pageObj.width()); 

            // Unmark current page and TOC item.
            exitCurrentPage();            

            // Hide all pages and re-display required page
            $(".page").hide(); // hide all pages
            showTopOfPage(); // Reposition document to show top.
            pageObj.addClass('current').fadeIn(200);
            $('.toc-item[data-target="' + pageClass + '"]').addClass('current'); // Mark the corresponding TOC item as current.

            // Adjust current page number.
            var pageNo = 0;
            if (isInteger(pageNbr)) {
                currentPage = toInteger(pageNbr);
                pageNo = currentPage + 1;      // pageNo is 1-based; currentPage is zero-based.
            }
            $("#current-page").text(pageNo);
            $("#total-pages").text(totalPages);

            // Enable/disable Prev and Next buttons based on pageNbr.
            // Note that pageNo starts at page 1.
            if (pageNo === totalPages) {
                disableNav('.nav-page.nav-next');
            }
            else {
                enableNav('.nav-page.nav-next');
            }
            if (pageNo < 2) {
                disableNav('.nav-page.nav-prev');
            }
            else {
                enableNav('.nav-page.nav-prev');
            }

            // Disable Next button if page has an interactive element.
            if (pageObj.find('.must-be-clicked').length > 0) {
                disableNav('.nav-page.nav-next');
            }

            // Lastly, run function required before showing page content.
            runPageFuncBeforeShow(pageObj);

            // Update bookmark for this SCO.
            setScoBookmark(currentPage);
        }
    }

    // Sets the bookmark for the SCO
    function setScoBookmark(pageNumber) {
        if ((typeof SB !== 'undefined') && scoModeIsNormal) {
            SB.setValue('cmi.location', pageNumber.toString());
        }
    }

    // Gets the bookmark for the SCO
    function getScoBookmark() {
        var bookmark = 0;
        if (typeof SB !== 'undefined') {
            bookmark = toInteger(SB.getValue('cmi.location'));
        }
        return bookmark;
    }

    // Sets the list of completed pages in the SCO's suspend-data
    function setScoCompletedPages(compPages) {
        if (typeof SB !== 'undefined') {
            if (compPages instanceof Array || compPages.length > 0) {
                SB.setValue('cmi.suspend_data', compPages.join(','));
            }
            else {
                SB.setValue('cmi.suspend_data', '');
            }
        }
    }

    // Gets the completed pages list from the SCO's suspend-data
    function getScoCompletedPages() {
        var compPages = [];
        if (typeof SB !== 'undefined') {
            var suspData = SB.getValue('cmi.suspend_data'); // This should return a string.
            if (typeof suspData !== 'undefined' && suspData.length > 0) {
                compPages = suspData.split(',');      
            }
        }
        return compPages;
    }

    // Exits out of the current page.
    function exitCurrentPage() {
        // If current page has no element that requires interaction, mark as completed.
        var cp = $('.page.current');
        if (cp.length > 0 && cp.children('.page-content').find('.must-be-clicked:eq(0)').length === 0) {
            cp.addClass('completed'); // Mark page as complete
            $('.toc-item.current').addClass('completed'); // Mark corresponding TOC item as complete.

            // Add page number to list of completed pages.
            var pageNbr = cp.index(); // Zero-based page numbering
            if (completedPages.length === 0 || completedPages.indexOf(pageNbr) === -1) {
                completedPages.push(pageNbr);
                setScoCompletedPages(completedPages);
            }
        }

        // Unmark current page and TOC item.
        cp.removeClass('current');
        $('.toc-item.current').removeClass('current');            
        
    }


    // Handle window resize
    function resizePage() {
        relocateTOC();
    }


    // Load Questions for a specific quiz (identified by the containerSelector)
    function loadQuiz(qzContentId, qzData) {
        
        if (typeof qzData === 'undefined') return false;

        // If unable to find container, do nothing.
        qzContent = $('#'+qzContentId);
        if (qzContent.length === 0) return false;

        // If there are no questions, there is nothing to load.
        var questions = (qzData.questions !== 'undefined') ? qzData.questions : [];
        if (questions.length === 0) return false;

        // Get quiz size. If not defined, assume all questions will be presented during the quiz.
        var qzSize = (qzData.quizSize !== 'undefined') ? qzData.quizSize : questions.length;

        var showHints = (qzData.showHints !== 'undefined' && typeof qzData.showHints === 'boolean') ? qzData.showHints : true;
        var shuffleChoices = (qzData.shuffleChoices !== 'undefined' && typeof qzData.shuffleChoices === 'boolean') ? qzData.shuffleChoices : true;

        // Get quiz passing score and weight. If not defined, assume 100% (or 1.0).
        var quizPassingScore = (qzData.passingScaledScore !== 'undefined') ? qzData.passingScaledScore : "100.0";
        var quizWeight = (qzData.quizWeight !== 'undefined') ? qzData.quizWeight : "100.0";

        if (qzContent.hasClass('quiz-ready') === false) {
            
            // Find element where to load questions, then clear it.
            qzQuestions = qzContent.find('.quiz-questions:eq(0)');
            qzQuestions.hide().html('');

            var qCount = 0

            shuffleArray(questions);

            for (i = 0; i < qzSize; i++) {

                // If this question item has no id, nor text, nor choices, nor answer, then ignore it.
                if (typeof questions[i].id === 'undefined' 
                    || typeof questions[i].text === 'undefined' 
                    || typeof questions[i].answer === 'undefined'
                    || !(questions[i].choices instanceof Array)
                    || questions[i].choices.length < 2) 
                    continue;

                // Question Text
                var qt = '<div class="q-header">Question:</div><div class="q-text">' + questions[i].text + '</div>';
                
                // Question Answer
                var ans = $.trim(questions[i].answer);
                
                // Question Choices
                // Read them first into an array so we can shuffle them.
                var qc = '';
                var choices = [];
                var chCount = questions[i].choices.length;
                for (j = 0; j < chCount; j++) {
                    var chtext = $.trim(questions[i].choices[j]);
                    var chtype = (chtext === ans && ans !== '') ? "correct" : "incorrect";
                    var chhint = (typeof questions[i].hints !== 'undefined') ? chhint = $.trim(questions[i].hints[j]) : "";
                    choices.push({text: chtext, type: chtype, hint: chhint})
                }
                // Now shuffle the choices. If there is a choice like 'Both of the above', 'All of the above' 
                // or 'None of the above', leave that choice where it is and shufle only the other choices
                // since it sounds weird to say "All of the above" when all other choices are below it.
                if (shuffleChoices) {
                    var lastChoice = choices[chCount - 1].text;
                    if (lastChoice.toLowerCase().indexOf("of the above") > -1) {
                        shuffleArray(choices, (chCount - 1));
                    }
                    else {
                        shuffleArray(choices);
                    }
                }

                // Build the html markup for the choices.
                for (j = 0; j < chCount; j++) {
                    var ch = ((choices[j].hint !== '') ? (' data-chhint="' + choices[j].hint + '"') : '')
                           + ' data-chtype="' + choices[j].type + '"';
                    qc += '<div class="q-choice"' + ch + '>' + choices[j].text + '</div>';
                }
                qc = '<div class="q-choices"><div class="q-header">Choices:</div>' + qc + '</div>';

                // Area for dynamically adding hints when a question is answered.
                var qh = '<div class="q-hint"></div>';

                // Build full html markup for the question item, including choices and hint area.

                var qm = '<div class="q-item unanswered" data-qid="seq-' + (i+1) + '-' + questions[i].id + '">' + qt + qc + qh + '</div>';

                // Append to the questions container.
                qzQuestions.append(qm);

                // Track number of questions used.
                qCount += 1;
            }

            if (qCount > 0) {
                qzContent.addClass('quiz-ready')
                qzContent.attr({
                    'data-qsize': qCount, 
                    'data-qpassingscore': quizPassingScore,
                    'data-qweight': quizWeight,
                    'data-qscore': '0',
                    'data-qpass': 'false',
                    'data-qstarted': 'false',
                    'data-qhints': showHints
                });
            }

            return (qCount > 0); // Return false if no questions loaded.
        }
    }

    // This starts the quiz. 
    function startQuiz(qzContentId) {

        // If unable to find container, do nothing.
        qzContent = $('#'+qzContentId);
        if (qzContent.length === 0) return false;

        // Hide results section of the quiz
        qzContent.find('.quiz-result').hide();

        // Update total number of questions shown in the counter on the header.
        totalQuestions = qzContent.attr('data-qsize');
        $('#total-questions').text(totalQuestions); 

        // Start quiz from the first unanswered question.
        // Note the question number is zero-based. If all questions are answered, set to -1.
        var uq = qzContent.find('.q-item.unanswered:eq(0)');
        currentQuestion = (uq.length > 0) ? qzContent.find('.q-item').index(uq) : -1; 
   
        hideTOC(); // Hide Table of Contents if visible.
        disableNav('.nav-toc'); // Disable the TOC button

        // Mark quiz as started. Show content.
        qzContent.attr({
            'data-qstarted': 'true'
        }).show();

        // Initialize date field for tracking time spent for each question
        qzStartTime = new Date();

        // If in browse or review mode or non-credit, or if there is no more unanswere question, then end quiz right away.
        if (!scoModeIsNormal || !scoIsRunForCredit || uq.length === 0) {
            endQuiz(); // Go straight to results
            enableNav('.nav-toc'); // Enable TOC.
        }
        // Run quiz.
        else {
            showQuizNavs(); // Switch from page navs to quiz navs
            showQuestion(currentQuestion);
        }

    }

    // Ends the quiz.
    function endQuiz() {

        if (qzContent.length === 0) return;
        qzResult = qzResult || qzContent.find('.quiz-result');
        if (qzResult.length === 0) return;
        qzResult.html(''); // Clear results

        // Get quiz size (ie, number of questions)
        totalQuestions = (qzContent.attr('data-qsize') !== 'undefined') ? qzContent.attr('data-qsize') : qzQuestions.find('.q-item').length;

        // Get quiz passing score and quiz weight. 
        quizPassingScore = qzContent.attr('data-qpassingscore');
        quizPassingScore = (parseFloat(quizPassingScore) !== 'NaN') ? parseFloat(quizPassingScore) : 100.00;
        
        // Calculate results for this quiz
        missingAnswers = qzContent.find('.q-item.unanswered').length;
        correctAnswers = qzContent.find('.q-item[data-response-result="correct"]').length;

        var qzScore = Math.floor((correctAnswers/totalQuestions)*100);
        var qzPassed = (qzScore >= quizPassingScore);
    
        // Write result back to the qzContent
        qzContent.attr({
            'data-qscore': qzScore,
            'data-qpass': qzPassed
        });

        var r1 = (qzPassed ? 'Yay! You passed this quiz.' : 'Sorry, you failed this quiz.');
        var r2 = 'You correctly answered ' + correctAnswers + ' out of ' + totalQuestions + ' questions.';
        var rc = (qzPassed ? 'passed' : 'failed');

        // Write results and give option to re-take this quiz.
        qzResult.html('<h3>Quiz Results</h3>' + 
                      '<p><span class="qz-result ' + rc + '">' + r1 + '</span><span>' + r2 + '</span></p>');

        // If learner did not get a passing score, give option to redo the quiz.
        if (!qzPassed) {
            qzResult.append('<br/>' +
                      '<div class="redo-quiz">' +
                      '<h4>Take this quiz again?</h4>' +
                      '<p>Taking the quiz again will clear your current results.</p>' +
                      '<span class="btn btn-primary btn-restart-quiz">Restart Quiz <i class="fa fa-chevron-right"></i></span>' +
                      '</div>');

            // Listen to the click event for the "Restart Quiz" button.
            qzResult.off('click', '.btn-restart-quiz');
            qzResult.on('click', '.btn-restart-quiz', function (e) {
                qzQuestions.find('.q-item').each(function () {
                    if ($(this).hasClass('unanswered') === false) {
                        clearChoice($(this));
                    }
                })
                startQuiz(qzContentId);
                e.stopPropagation();
            })
        }

        qzQuestions.hide();
        qzResult.show();
        hideQuizNavs()
        showTopOfPage();

        setScoCompletionStatus();
    }

    // Records SCO's overall status
    function setScoCompletionStatus() {
        
        // Grade the course. 
        // This performs a simple calculation:
        // - Each quiz score is multipled by its weighting. This forms the quiz's weighted score.
        // - The sum of all the weighted score of all quiz forms the overall lesson score.
        if ((typeof SB !== 'undefined') && scoModeIsNormal && scoIsRunForCredit) {
            // Get all .quiz-content and find out their individual scores.
            var overallScore = 0.0;
            $('.quiz-content').each(function () {
                var score = $(this).attr('data-qscore');
                score = (parseFloat(score) !== 'NaN') ? parseFloat(score) : 100.00;
                var weight = $(this).attr('data-qweight');
                weight = (parseFloat(weight) !== 'NaN') ? parseFloat(weight) : 100.00;
                overallScore += (score * weight / 100);
            })

            // Record overall score.
            SB.setValue('cmi.progress_measure', overallScore/100);
            SB.setValue('cmi.score.raw', overallScore);
            SB.setValue('cmi.score.scaled', overallScore/100);

            // Let the LMS mark the content as Passed or Failed.
            //if (qzPassed) {
            //    SB.setValue('cmi.success_status', 'passed');
            //}
            //else {
            //    SB.setValue('cmi.success_status', 'failed');
            //}

            // If all quiz has been launched, do not suspend anymore.
            if ($('.quiz-content[data-qstarted="false"]').length === 0) {
                SB.setValue('cmi.exit', 'normal');
                scoSuspend= false;
                SB.setValue('cmi.complete_status', 'completed');
            }
        }        
    }

    // Shows the quiz navigation button. 
    function showQuizNavs() {
        // If playing a quiz page-content on its own, show the webbar.
        if (!(scoPlayer.playFullContent())) {
            if ($('.page-content').hasClass('quiz-content') == true) {
                $('.webbar').show();
                $('.counter-panel').show();
            }
        }
        // If playing full content, switch from page navigation to quiz navigation.
        else {
            $('.nav-page').hide();
            $('.nav-quiz').show();  
        }              
    }

    // Hides the quiz navigation button. 
    function hideQuizNavs() {
        // If playing a quiz page-content on its own, hide the webbar.
        if (!(scoPlayer.playFullContent())) {
            if ($('.page-content').hasClass('quiz-content') == true) {
                $('.webbar').hide();
            }
        }
        // If playing full content, switch from quiz navigation to page navigation.
        else {
            $('.nav-quiz').hide();
            $('.nav-page').show();
        }       
    }

    // Presents the question identified by its sequence number.
    function showQuestion(qNo) {
        if (qNo <= totalQuestions && qzQuestions instanceof jQuery && qzQuestions.length === 1) {
            qzQuestions.show().children('.q-item').hide();
            showTopOfPage(); // Reposition document to show top
            var qitem = qzQuestions.children('.q-item:eq(' + (qNo - 1) + ')').fadeIn(200);
            // Mark time when question was shown.
            qzStartTime = new Date();
            // Update question number in the header
            currentQuestion = qNo;
            $('#current-question').text(currentQuestion + 1); // currentQuestion is zero-based.
            toggleQuestionNav(qitem);
        }
    }

    // Records the choice selected for a question.
    function noteChoice(choice) {
        var qitem = choice.closest('.q-item');
        if (qitem.length === 0) return;
        
        // If user clicks on a choice previously selected, then un-select.
        if (choice.hasClass('selected') === true) {
            clearChoice(qitem);
        }
        // Otherwise, mark it as the choice/answer
        else {
            markChoice(choice);
        }
    }

    function toggleQuestionNav(qitem) {
        if (currentQuestion === 0) {
            disableNav('.nav-quiz.nav-prev');
        }
        else {
            enableNav('.nav-quiz.nav-prev');
        }

        if (currentQuestion === totalQuestions - 1) {
            disableNav('.nav-quiz.nav-next');
        } 
        else {
            enableNav('.nav-quiz.nav-next');
        }
    }

    // Marks the question item as unanswered. Reset the choice previously made for this question item, if any.
    function clearChoice(qitem) {
        qitem.attr('data-response-result', '').addClass('unanswered').find('.q-choice.selected').removeClass('selected');
        clearQuestionHint(qitem);
    }

    // Highlights the selected answer from the multiple choice.
    function markChoice(choice) {
        // Check if choice is correct.
        var ansType = choice.attr('data-chtype');
        // Get container q-item
        var qitem = choice.closest('.q-item');
        // Clear previous choice made (if any);
        qitem.find('.q-choice.selected').removeClass('selected'); 
        // Note the choice
        choice.addClass('selected')
        var choiceText = choice.text();
        // Note if user's answer is correct or not, and mark the question as answered.
        qitem.attr('data-response-result',ansType).removeClass('unanswered'); 

        if ((typeof SB !== 'undefined') && scoModeIsNormal) {
            var iactId = qitem.attr('data-qid');
            var mc = qitem.children('.q-choices');
            // Get the correct choice (as choice 'A', 'B', 'C', etc.)
            var i = mc.children('.q-choice[data-chtype="correct"]').index();
            var coresp = ALPHABET.substr(i,1);
            // Get the user choice (as choice 'A', 'B', 'C', etc.)
            i = mc.children('.q-choice.selected').index();
            var usresp = ALPHABET.substr(i,1);
            var result = qitem.attr('data-response-result');
            var strTime = qzStartTime;
            var endTime = new Date();
            var qtext = qitem.children('.q-text:eq(0)').text();
            var qchc = '';
            qitem.find('.q-choice').each(function () {
                if ($(this).hasClass('unanswered') === false) {
                    var i = $(this).index();
                    var chc = ALPHABET.substr(i,1) + '=' + $(this).text();
                    qchc += ' ' + chc;
                }
            });
            var qwght = 1/totalQuestions;

            SB.setInteraction({
                id: iactId,                          // {String} Unique question id
                type: 'choice',                      // {String} Our quiz consists of multiple choice questions
                timestamp: strTime,
                correct_responses: [                 // {Array} ** Only supports one correct answer **
                    {                                // {Object}
                        pattern: [coresp]            // {String} correct response, represented as 'A', 'B', 'C', etc. 
                    }
                ],
                weighting: qwght,                    // {String} Each question has a weighting of 1/totalQuestions.
                learner_response: [usresp],          // {String} user response, represented as 'A', 'B', 'C', etc. 
                result: result,                      // {String} correct or incorrect
                latency: endTime,
                description: qtext + qchc            // {String} question text, includes choices
            });

        }
        showQuestionHint(qitem);
    }

    // Clears the hint for a question
    function clearQuestionHint(qitem) {
        if (!(qitem instanceof jQuery) || qitem.length === 0) return;
        if (qzContent.length === 0) return;
        if (qzContent.attr('data-qhints') !== 'true') return; // Do nothing if hints is off.
        var hintArea = qitem.children('.q-hint:eq(0)');
        if (hintArea.length > 0) {
            hintArea.html('');
            hintArea.hide();
        }
    }

    // Shows hint when a question is answered
    function showQuestionHint(qitem) {
        if (!(qitem instanceof jQuery) || qitem.length === 0) return;
        if (qzContent.length === 0) return;
        if (qzContent.attr('data-qhints') !== 'true') return; // Do nothing if hints is off.

        var choice = qitem.find('.q-choice.selected:eq(0)'); // Get the selected answer
        if (choice.length === 0) return;

        var hintArea = qitem.children('.q-hint:eq(0)');
        if (hintArea.length > 0) {
            var hint = choice.attr('data-chhint');
            var ansType = choice.attr('data-chtype');
            if (typeof ansType === 'undefined' || $.trim(ansType) === '') {
                ansType = "incorrect";
            }
            // If no hint text, use default. 
            hint = hint || 
                    ((ansType !== 'correct') 
                        ? "Sorry, but that is <strong>incorrect</strong>."
                        : "That is <strong>correct</strong>. Well done!");
            hintArea.removeClass('q-ans-correct').removeClass('q-ans-incorrect');
            hintArea.fadeOut(100, function () {
                hintArea.html(hint);    
                hintArea.fadeIn(100);
                hintArea.addClass('q-ans-'+ansType);
            })
        }
    }

    // Redraws pseudo elements if IE8
    function redrawPseudos(selector) {
        if (ieVersion === 8) {
            var head = document.getElementsByTagName('head')[0],
            style = document.createElement('style');
            style.type = 'text/css';
            style.styleSheet.cssText = selector + ' *:before,' + selector + ' *:after{content:none !important;}';
            head.appendChild(style);
            setTimeout(function () {
                head.removeChild(style);
            }, 0);
        }
    }

    // This handles 'Read More' elements.
    // The expected structure of the 'Read More' is this:
    //   <span class="read-more collapsed"><span>Add text here that shows when user clicks 'Read More', and hides when user clicks 'Read Less'.</span></span>
    // If you wish the element to be shown initially, replace the 'collapsed' class with 'expanded'.

    function readMoreOrLessOf(elem) {
        if (elem instanceof jQuery === false || elem.length === 0) return;
        if (elem.hasClass('collapsed') === true) {
            elem.removeClass('collapsed').addClass('expanded');
        }
        else {
            elem.removeClass('expanded').addClass('collapsed');
        }
    }

    // This initialises accordion elements
    function initialiseAccordions() {
        // Unbind our handlers from the click event. Then re-bind.
        $('body').off('click', '.accordion-header'); 
        $('body').on('click', '.accordion-header', function () {
            var parent = $(this).parent().closest('.accordion');
            var motion = 'slide';
            if (parent.length > 0) {
                if (parent.hasClass('accordion-slide') === true) {
                    motion = 'slide';
                }
                else if (parent.hasClass('accordion-fade') === true) {
                    motion = 'fade';
                }
            }
            var current = $(this);
            if (current.hasClass('collapsed') === true) {
                var previous = $('.accordion-header.expanded');
                if (previous.length > 0) {
                    previous.removeClass('expanded')
                        .addClass('collapsed');
                    if (motion === 'fade') {
                        previous.next('.accordion-detail').fadeOut(200, function () {
                            current.removeClass('collapsed')
                                    .addClass('expanded')
                                    .next('.accordion-detail').fadeIn(200);
                        });
                    }
                    if (motion === 'slide') {
                        previous.next('.accordion-detail').slideUp(200, function () {
                            current.removeClass('collapsed')
                                    .addClass('expanded')
                                    .next('.accordion-detail').slideDown(200);
                        });
                    }
                }
                else {
                    current.removeClass('collapsed')
                            .addClass('expanded');
                    if (motion === 'fade') {
                        current.next('.accordion-detail').fadeIn(200);
                    }
                    if (motion === 'slide') {
                        current.next('.accordion-detail').slideDown(200);
                    }                   
                }
            }
            else {
                current.removeClass('expanded')
                        .addClass('collapsed');                        
                if (motion === 'fade') {
                    current.next('.accordion-detail').fadeOut(200);
                }
                if (motion === 'slide') {
                    current.next('.accordion-detail').slideUp(200);
                }
            }
        })
    }

    // Collapses all accordion elements
    function accordionCollapseAll(elem) {
        if (elem instanceof jQuery && elem.length === 1) {
            elem.find('.accordion-detail').hide();
        }
    }

    // Expands all accordion elements
    function accordionExpandAll(elem) {
        if (elem instanceof jQuery && elem.length === 1) {
            elem.find('.accordion-detail').show();
        }
    }


    // Shows top of document.
    function showTopOfPage() {
        $('body').scrollTop(0);
    }

    //------------------------------------------------------------------------------------------------
    //  Shuffles an array
    //  (by Jonas Raoni Soares Silva @ http://jsfromhell.com/array/shuffle [v1.0])
    //  FF: Added second parameter (e) to shuffle only the first number of elements in the array
    //------------------------------------------------------------------------------------------------
    function shuffleArray(o, e) {
        // This shuffles all elements in the array. But we do not want it.
        //for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);

        // Shuffle only the first 'e' elements. If 'e' is more than the size, then shuffle the whole array.
        if ((e == undefined) || (e > o.length)) e = o.length;
        if (e < 0) e = 0;

        for(var j, x, i = e; i; j = parseInt(Math.random() * i, 10), x = o[--i], o[i] = o[j], o[j] = x);
    }

    // Converts a string into an integer if a valid integer.
    function toInteger(s) {
       return (parseInt(s, 10) === 'NaN') ? 0 : parseInt(s, 10);
    }

    // Tests a string if integer
    function isInteger(s){
       return (parseInt(s, 10) == s);
    }

}).apply(scoPlayer)

// Returns IE version if browser is IE. Else, it returns undefined.
var ieVersion = (function () {

    var undef,
        v = 3,
        div = document.createElement('div'),
        all = div.getElementsByTagName('i');

    while (
        div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->', all[0]
    );

    return v > 4 ? v : undef;

})();
