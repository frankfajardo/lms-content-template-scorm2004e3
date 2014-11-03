# SCORM 2004 SCO Template #


This is a SCORM 2004 3E package template I used to create learnning contents in Milo relating to Pearson Australia Policies. 


## Version ##

1.0.0


## How to Use ##

* This template allows you to build your content section by section. Each section is, at least, a single HTML page which you can author using the template **templates/sco-page-template.html**. You can read comments included in the template for more details.
* All your section HTML files should reside in the **content** folder. It is up to you if you wish to have subfolders to further split your content. But keep it simple.
* You can test each section by clicking the HTML file in your file explorer, and it should launch your web browser. You can check out HTML files already in the **content** folderof this template. These are all available to provide as sample. You can delete all of these files when you start buiding your content sections.
* Then you can repeat this process for all sections.
* As you build each section, you compile your sections into a into a table of content. This template uses (or expects you to use) a JSON file specifically in the path **launch/sco-content.json**. This table will eventually build the "Table of Content" for your SCO.
* To create a section for your quiz, you can use the same template as your normal section. There are comments in the template about building a quiz section. You will need to also create your quiz data in JSON format using the template **templates/quiz-data-template.html**.
* The template allows you to create multiple quiz sections in your SCO. It performs a simple rollup of scores which it sends to your LMS.
* When you have completed all your sections, you can test your whole content. But before you do so, provide a **content/_cover.jpg** image which your content can use as initial display whilst building all sections of your content. A sample is included with this template.
* To test your content without an LMS, I use WebMatrix to open the whole folder as a website. And I can simply launch the starting page **launch/sco-player.html**. It is important that you run the whole content using a webserver. WebMatrix provides you the convenience of launching your folder as a website using IISExpress. You can use equivalent means if you wish.
* When you are happy with your content, it is time to package it and send to your LMS.
* I use [RELOAD Editor] to create my **imsmanifest.xml**. This template comes with a sample imsmanifest.xml for your reference.


## Folder Organization ##

  * Standard SCORM files you can leave as is. There is no need to change these files.

    * common/*
    * extend/*
    * schemas/*
    * unique/*
    * vocab/*


  * Standard SCORM files that you must change.
 
    * imsmanifest.xml - this is essential for your LMS to recognise your content. Note that this file references the files above. You must leave those references as they are.


  * Standard Template Content - These are files used by the template to run your content. There is no need to change these files unless you wish to change how this template behaves.
 
    * launch/sco-player.html
    * shared/css/*
    * shared/img/*
    * shared/js/*


  * Files you must change:
 
    * imsmanifest.xml - this is essential for you content to be properly recognised by your LMS
    * content/_cover.jpg - this is the flash image shown when the content is launched.
    * content/* - these are your section file (*.html, image files, etc.)
    * launch/sco-content.json - this is your content table


  * Files you can exclude from your package to reduce size:
 
    * templates - you can remove the whole folder
    * README.md - this file
    * shared/css/sco-player.css - the player uses the minified version.
    * shared/js/sco-player.js - the player uses the minified version. 
    * shared/js/SCOBot/SCORM_API.js - the player uses the minified version.
    * shared/js/SCOBot/SCOBot.js - the player uses the minified version.
    * shared/js/SCOBot/Local_API_1484_11.js - the player uses the minified version.


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
    