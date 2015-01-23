# SCORM 2004 SCO Template #


This is a SCORM 2004 3E package template I used to create learnning contents in Milo relating to Pearson Australia Policies. 


## Version ##

1.0.0


## How to Use ##

This template allows you to build your SCO content page by content page. A content page can also be a full quiz. Each content page is single HTML file with supporting files (images and other embedded content). When you have built all your content pages, then you can organise them into your full content.

This template comes with a player for your SCO. The player expects the content pages to follow the templates provided.

1. Start by copying this template, and renaming the main folder to the name of your SCO.
2. Clear the **content** folder. This is where all your content files (html, image files, other embedded or dynamically loaded content). 
3. Create each content page using the template **templates/sco-page-template.html**. You can read comments included in the template for more details. Place your resulting files in the **content** folder. It is up to you if you wish to have subfolders to further split your content. But keep it simple. You can check out HTML files already in the **content** folder in this template. These files are samples. 
4. Test each content page. You should be able to click the HTML file in your file explorer, and it should launch your web browser with your HTML content. 
5. Repeat these steps for all content pages.
6. To create a quiz, you can use the same template **templates/sco-page-template.html**. There are comments in the template about building a quiz. You will need to also create your quiz data in JSON format using the template **templates/quiz-data-template.html**. The SCO player provide helper method to load and start the quiz. Refer to comments in the template.
7. The template allows you to create multiple quiz sections in your SCO. It performs a simple rollup of scores which it sends to your LMS.
8. As you build each content page, you need to list your sections into a JSON file **launch/sco-content.json**. This is what this SCO template will use to compile your whole SCO, and built the "Table of Content" for your SCO. 
9. When you have completed all your content pages, you can test your whole content. But before you do so, provide a **content/_cover.jpg** image which the player can initially display whilst uploading your SCO's content pages. A sample is included with this template. Note the size of the _cover.jpg image provided.
10. You can test your SCO without an LMS. You will not be able to test LMS related functions (like scoring of quiz) but you can test the flow of your SCO. I use WebMatrix to open the whole folder as a website. And I can simply launch the starting page **launch/sco-player.html**. It is important that you run the whole content using a webserver. WebMatrix provides you the convenience of launching your folder as a website using IISExpress. You can use equivalent techniques and software if you wish.
11. When you are happy with your content, it is time to package it and send to your LMS. I use [RELOAD Editor] to update my **imsmanifest.xml**. This template comes with a sample imsmanifest.xml for your reference. Once all okay, [RELOAD Editor] can also create the SCORM Package. This is what you can import to your LMS.
12. For a test LMS, you can use [SCORM Cloud]. It is a free LMS for non-commercial use. So you can create an account with them and then use it to upload and test your SCO. Please be aware of the conditions of use of this facility.


## Folder Organization ##

  * Standard SCORM files you can **leave as is**. There is no need to change these files.

    * common/*
    * extend/*
    * schemas/*
    * unique/*
    * vocab/*


  * Standard SCORM files that you **must update**.
 
    * imsmanifest.xml - this is essential for your LMS to recognise your content. Note that this file references the files above. You must leave those references as they are.


  * Standard Player Content - These are files used by the player to run your content. *There is no need to change these files unless you wish to change how this player behaves.*
 
    * launch/sco-player.html
    * shared/css/*
    * shared/img/*
    * shared/js/*


  * Files you **must change or provide**:
 
    * content/_cover.jpg - this is the flash image shown when the content is launched.
    * content/* (see explanation above)
    * launch/sco-content.json - this is your content page listing


  * Files you should **exclude from an LMS deployment**:
 
    * shared/js/SCOBot/Local_API_1484_11.js
    * shared/js/SCOBot/Local_API_1484_11.min.js


  * Files you can **exclude from your SCORM package to reduce size**:
 
    * templates - you can remove the whole folder
    * README.md - this file
    * shared/css/sco-player.css - the player uses the minified version.
    * shared/js/sco-player.js - the player uses the minified version. 
    * shared/js/SCOBot/SCORM_API.js - the player uses the minified version.
    * shared/js/SCOBot/SCOBot.js - the player uses the minified version.
    * .git folder (or similar), if you are using GIT for source version management. You can manually delete this from your SCORM ZIP package.


## Contact ##

[Frank Fajardo]


## Credits ##

This project uses the following open-source projects and tools:

* [FontAwesome] - scalable vector icons in the form of fonts
* [jQuery] - library that simplifies cross-browser javascripting
* [Modernizr] - library to check browser capabilities
* [SCOBot] - library that simplifies SCORM functions
* [WebMatrix] - Free lightweight web development tool from Microsoft.



[Frank Fajardo]:https://neo.pearson.com/people/UFajaFr
[FontAwesome]:http://fortawesome.github.io/Font-Awesome/
[jQuery]:http://jquery.com
[Modernizr]:http://modernizr.com/
[SCOBot]:https://github.com/cybercussion/SCOBot/wiki/SCORM-SCOBot-Documentation
[RELOAD Editor]:http://www.reload.ac.uk/new/editor.html
[SCORM Cloud]:https://cloud.scorm.com/
[WebMatrix]:http://www.microsoft.com/web/webmatrix/