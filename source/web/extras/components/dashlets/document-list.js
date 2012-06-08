/**
 * Alfresco.dashlet.VideoWidget
 *
 * Displays a user-selected video file on a user's dashboard
 *
 */
(function()
{
   /**
    * YUI Library aliases
    */
   var Dom = YAHOO.util.Dom,
      Event = YAHOO.util.Event;

   /**
    * Alfresco Slingshot aliases
    */
    var $html = Alfresco.util.encodeHTML,
       $combine = Alfresco.util.combinePaths,
       $hasEventInterest = Alfresco.util.hasEventInterest;

   /**
    * VideoWidget constructor.
    * 
    * @param {String} htmlId The HTML id of the parent element
    * @return {Alfresco.dashlet.VideoWidget} The new VideoWidget instance
    * @constructor
    */
   Alfresco.dashlet.VideoWidget = function(htmlId)
   {
      Alfresco.dashlet.VideoWidget.superclass.constructor.call(this, "Alfresco.dashlet.VideoWidget", htmlId, ["button", "container", "datatable", "datasource", "uploader"]);
      
      // Initialise prototype properties
      this.configDialog = null;
      
      // Decoupled event listeners
      if (htmlId != "null")
      {
         YAHOO.Bubbling.on("renderCurrentValue", this.onDocumentsSelected, this);
      }
      
      return this;
   };

   YAHOO.extend(Alfresco.dashlet.VideoWidget, Alfresco.component.Base,
   {

      /**
       * Object container for initialization options
       *
       * @property options
       * @type object
       */
      options:
      {
         /**
          * The component id
          *
          * @property componentId
          * @type string
          * @default ""
          */
         componentId: "",

         /**
          * The nodeRef to the video to display
          *
          * @property nodeRef
          * @type string
          * @default ""
          */
         nodeRef: "",

         /**
          * The name of the configured content item
          *
          * @property name
          * @type string
          * @default ""
          */
         name: "",

         /**
          * The title property of the configured content item
          *
          * @property title
          * @type string
          * @default ""
          */
         title: "",

         /**
          * The mimetype of the configured content item
          *
          * @property mimeType
          * @type string
          * @default ""
          */
         mimeType: "",

         /**
          * The size in bytes of the configured content item
          *
          * @property size
          * @type string
          * @default ""
          */
         size: "",

         /**
          * The siteId of the current site
          *
          * @property site
          * @type string
          * @default ""
          */
         site: ""
      },
      
      /**
       * Configuration dialog instance
       *
       * @property configDialog
       * @type object
       */
      configDialog: null,
      
      /**
       * Video previewer object
       *
       * @property videoPreview
       * @type object
       */
      videoPreview: null,
      
      /**
       * Dashlet title Dom element
       *
       * @property titleEl
       * @type HTMLElement
       */
      titleEl: null,
      
      /**
       * Dashlet message area Dom element
       *
       * @property messageEl
       * @type HTMLElement
       */
      messageEl: null,
      
      /**
       * Dashlet preview area Dom element
       *
       * @property previewEl
       * @type HTMLElement
       */
      previewEl: null,
      
      /**
       * Fired by YUI when parent element is available for scripting.
       * Component initialisation, including instantiation of YUI widgets and event listener binding.
       *
       * @method onReady
       */
      onReady: function VideoWidget_onReady()
      {
         // Cache frequently used Dom elements
         this.titleEl = Dom.get(this.id + "-title");
         this.messageEl = Dom.get(this.id + "-msg");
         this.previewEl = Dom.get(this.id + "-preview");
         
         // Add click handler to config feed link that will be visible if user is site manager.
         var configLink = Dom.get(this.id + "-configVideo-link");
         if (configLink)
         {
            Event.addListener(configLink, "click", this.onConfigVideoClick, this, true);            
         }
         
         // Set up the title
         this._setupTitle();
         
         // Set up the message area
         this._setupMessage();
         
         // Set up the preview area with default parameters (i.e. do not load data)
         this._setupPreview();
      },
      
      /**
       * Set up the dashlet title
       *
       * @method _setupTitle
       */
      _setupTitle: function VideoWidget__setupTitle()
      {
          if (this.options.nodeRef != "" && this.options.name != "")
          {
              this.titleEl.innerHTML = "<a href=\"" + Alfresco.constants.URL_PAGECONTEXT + 
                  "site/" + this.options.site + "/document-details?nodeRef=" + this.options.nodeRef + "\">" +
                  this.options.name + "</a>";
          }
          else
          {
              this.titleEl.innerHTML = this.msg("header.video");
          }
      },
      
      /**
       * Set up the dashlet message area
       *
       * @method _setupMessage
       */
      _setupMessage: function VideoWidget__setupMessage()
      {
          if (this.options.nodeRef != null && this.options.nodeRef != "")
          {
              Dom.setStyle(this.messageEl, "display", "none");
          }
          else
          {
             this.messageEl.innerHTML = this.msg("message.noVideo");
             Dom.setStyle(this.messageEl, "display", "block");
          }
      },
      
      /**
       * Set up the dashlet preview area
       *
       * @method _setupPreview
       * @param loadData {boolean} true if node metadata should be loaded using XHR, false otherwise.
       * This allows the size and mimetype of new nodes to be determined. Default is false.
       * @private
       */
      _setupPreview: function VideoWidget__setupPreview(loadData)
      {
          if (this.options.nodeRef != null && this.options.nodeRef != "")
          {
              Dom.setStyle(this.previewEl, "display", "block");
          }
          else
          {
             Dom.setStyle(this.previewEl, "display", "none");
          }
          
          if (this.videoPreview == null)
          {
              // Set up the video previewer
              this.videoPreview = new Alfresco.VideoPreview(this.id + "-preview").setOptions(
              {
                 nodeRef: this.options.nodeRef,
                 name: this.options.name,
                 icon: "/components/images/generic-file-32.png",
                 mimeType: this.options.mimeType,
                 size: this.options.size
              }).setMessages(
                    Alfresco.messages.scope[this.name]
              );
          }
          
          // Reload data via XHR if requested
          if (typeof(loadData) != "undefined" && loadData === true)
          {
              Alfresco.util.Ajax.jsonGet(
              {
                 url: Alfresco.constants.PROXY_URI + "api/metadata?nodeRef=" + this.options.nodeRef,
                 successCallback:
                 {
                     fn: function VP__loadDocumentDetails(p_response, p_obj)
                     {
                         // Get the document details
                         var documentDetails = {},
                             mcns = "{http://www.alfresco.org/model/content/1.0}",
                             content = p_response.json.properties[mcns + "content"];
                         documentDetails.fileName = p_response.json.properties[mcns + "name"];
                         documentDetails.mimetype = p_response.json.mimetype;
                         if (content)
                         {
                            var size = content.substring(content.indexOf("size=") + 5);
                            size = size.substring(0, size.indexOf("|"));
                            documentDetails.size = size;
                         }
                         else
                         {
                             documentDetails.size = "0";
                         }
                         // Notify the previewer via Bubbling
                         YAHOO.Bubbling.fire("documentDetailsAvailable", {
                             documentDetails: documentDetails
                         });
                     },
                     scope: this
                 },
                 failureMessage: "Failed to load document details for " + this.options.nodeRef,
                 noReloadOnAuthFailure: true
              });
          }
      },

      /**
       * YUI WIDGET EVENT HANDLERS
       * Handlers for standard events fired from YUI widgets, e.g. "click"
       */

      /**
       * Called when the user clicks the configure video link.
       * Will open a video config dialog
       *
       * @method onConfigFeedClick
       * @param e The click event
       */
      onConfigVideoClick: function VideoWidget_onConfigVideoClick(e)
      {
         var actionUrl = Alfresco.constants.URL_SERVICECONTEXT + "modules/dashlet/config/" + encodeURIComponent(this.options.componentId);
         
         Event.stopEvent(e);
         
         if (!this.configDialog)
         {
            this.configDialog = new Alfresco.module.SimpleDialog(this.id + "-configDialog").setOptions(
            {
               templateUrl: Alfresco.constants.URL_SERVICECONTEXT + "extras/modules/video/config", actionUrl: actionUrl,
               site: this.options.site,
               onSuccess:
               {
                  fn: function VideoWidget_onConfigFeed_callback(response)
                  {
                      // Update options from the submitted form fields
                      this.options.nodeRef = Dom.get(this.configDialog.id + "-nodeRef").value;
                      this.options.name = Dom.get(this.configDialog.id + "-video").innerHTML;
                      
                      if (this.videoPreview.options.nodeRef != this.options.nodeRef)
                      {
                          // Update the previewer's nodeRef
                          this.videoPreview.options.nodeRef = this.options.nodeRef;
                          
                          // Update dashlet title and message area
                          this._setupTitle();
                          this._setupMessage();

                          /*
                           * Since we only have limited data on the node from the picker (e.g. mimetype
                           * and size are missing), we need to retrieve this via XHR. We then notify the
                           * previewer and it does the rest.
                           */
                          this._setupPreview(true);
                      }
                  },
                  scope: this
               },
               doSetupFormsValidation:
               {
                  fn: function VideoWidget_doSetupForm_callback(form)
                  {
                     Dom.get(this.configDialog.id + "-nodeRef").value = this.options.nodeRef;
                     Dom.get(this.configDialog.id + "-video").innerHTML = this.options.name;

                     // Browse Button
                     this.widgets.browseButton = Alfresco.util.createYUIButton(this, "configDialog-filePicker-showPicker-button", this.onBrowseClick);
                     
                     var ${picker} = new Alfresco.ObjectFinder("${controlId}", "${fieldHtmlId}").setOptions({
                         
                     });
                  },
                  scope: this
               }
            });
         }
         else
         {
            this.configDialog.setOptions(
            {
               actionUrl: actionUrl
            });
         }
         this.configDialog.show();
      },
      
      /**
       * Dialog select video button event handler
       * 
       * @method onBrowseClick
       * @param e
       *            {object} DomEvent
       * @param p_obj
       *            {object} Object passed back from addListener method
       */
    onBrowseClick: function ACJC_onBrowseClick(e, p_obj)
    {
        // Set up file picker
        if (!this.widgets.picker)
        {
           //this.widgets.picker = new Alfresco.module.DocumentPicker(this.configDialog.id + "-filePicker");
           this.widgets.picker = new Alfresco.module.DoclibGlobalFolder(this.configDialog.id + "-filePicker");
           
           var allowedViewModes =
           [
              Alfresco.module.DoclibGlobalFolder.VIEW_MODE_REPOSITORY,
              Alfresco.module.DoclibGlobalFolder.VIEW_MODE_SITE,
              Alfresco.module.DoclibGlobalFolder.VIEW_MODE_USERHOME
           ];

           this.widgets.picker.setOptions(
           {
              allowedViewModes: allowedViewModes,
              siteId: this.options.site,
              //containerId: this.options.containerId,
              title: this.msg("title.destinationDialog"),
              nodeRef: "alfresco://company/home"
           });
        }
        /*this.widgets.picker.setOptions(
        {
           currentValue: this.options.nodeRef,
           itemFamily: "node",
           multipleSelectMode: false,
           mandatory: true
        });
        */
        // Show dialog
        this.widgets.picker.showDialog();
    }, 

    /**
       * Folder selected in destination dialog
       * 
       * @method onDestinationSelected
       * @param layer
       *            {object} Event fired
       * @param args
       *            {array} Event parameters (depends on event type)
       */
      onDestinationSelected: function ACJC_onDestinationSelected(layer, args)
      {
       
      },
 
      /**
       * Files selected in document picker
       * 
       * @method onDocumentsSelected
       * @param layer
       *            {object} Event fired
       * @param args
       *            {array} Event parameters (depends on event type)
       */
      onDocumentsSelected: function VideoWidget_onDocumentsSelected(layer, args)
      {
          // Check the event is directed towards this instance
          if ($hasEventInterest(this.widgets.picker, args))
          {
              var obj = args[1];
              if (obj !== null)
              {
                  var items = this.widgets.picker.currentValueMeta;
                  if (items && items.length == 1)
                  {
                      // Check value has changed, if so then update the form
                      if (this.options.nodeRef != items[0].nodeRef)
                      {
                          Dom.get(this.configDialog.id + "-nodeRef").value = items[0].nodeRef;
                          Dom.get(this.configDialog.id + "-video").innerHTML = items[0].name;
                      }
                  }
              }
          }
      }
   });

})();