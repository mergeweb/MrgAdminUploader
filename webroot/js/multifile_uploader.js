// This file handles the inline uploading of images
// This file depends on jquery.filedrop.js

$(function(){

    var dropbox = $('#dropbox'),
        message = $('.message', dropbox);

    // if we did not properly define these properties, then we cannot do any rotation
    var enableImageRotation = false;
    if(typeof moment !== 'undefined' && typeof filestackSignature !== 'undefined'){
    	enableImageRotation = true;
	}

	if(typeof attachment_foreign_key == 'undefined' || typeof attachment_foreign_model == 'undefined'){
		console.log('key or model not specified. shutting down attachment');
		return;
	}

    dropbox.filedrop({
        // The name of the $_FILES entry:
        fallback_id: 'dropzone',
        paramname:'data[Attachment][img]',
        maxfiles: 200,
    	maxfilesize: 15, // in mb
		url: '/admin/mrg_admin_uploader/attachments/multifile_ajax_upload/'+attachment_foreign_key+'/'+attachment_foreign_model,

        uploadFinished:function(i,file,response){
			if (response.status) {
				$.data(file).addClass('done');
			}else{
				$.data(file).addClass('error');
			}

			display_url(file, response);
			$(window).trigger('finished_upload');
            // response is the JSON object that post_file.php returns
        },

    	error: function(err, file) {
            switch(err) {
                case 'BrowserNotSupported':
                    showMessage('Your browser does not support HTML5 file uploads!');
                    break;
                case 'TooManyFiles':
                    alert('Too many files! Please select '+this.maxfiles+' at most!');
                    break;
                case 'FileTooLarge':
                    alert(file.name+' is too large! Please upload files up to 2mb.');
                    break;
                default:
                    break;
            }
        },

        // Called before each upload is started
        beforeEach: function(file){
            if(!file.type.match(/^image\//)){
                alert('Only images are allowed!');

                // Returning false will cause the
                // file to be rejected
                return false;
            }
			return true
        },

        uploadStarted:function(i, file, len){
            createImage(file);
        },

        progressUpdated: function(i, file, progress) {
            $.data(file).find('.progress').width(progress);
        }

    });

	var template = '<div class="preview">'+
                        '<span class="imageHolder">'+
                            '<img />'+
                            '<span class="uploaded"></span>'+
                        '</span>'+
                        '<div class="progressHolder">'+
                            '<div class="progress"></div>'+
                        '</div>'+
                    '</div>';

    function createImage(file){

        var preview = $(template),
            image = $('img', preview);

        var reader = new FileReader();

        image.width = 100;
        image.height = 100;

        reader.onload = function(e){

            // e.target.result holds the DataURL which
            // can be used as a source of the image:

            image.attr('src',e.target.result);
        };

        // Reading the file as a DataURL. When finished,
        // this will trigger the onload function above:
        reader.readAsDataURL(file);

        message.hide();
        preview.appendTo(dropbox);

        // Associating a preview container
        // with the file, using jQuery's $.data():

        $.data(file,preview);
    }

	function showMessage(msg){
        message.html(msg);
    }

	function display_url(file, response) {
		$.data(file).find('.progressHolder').replaceWith('<p>'+response.message+'</p>');
	}


	// necessary for the project images uploading
	AttachmentModel = Backbone.Model.extend({
		defaults: {
			attachment_foreign_key: attachment_foreign_key,
            model: attachment_foreign_model,
			rotation: 0,
			saving: false
		},
		url: '/admin/mrg_admin_uploader/attachments.json',
		sync: function(method, model, options) {
			options = options || {};

			switch (method) {
				case 'update':
					options.url = '/admin/mrg_admin_uploader/attachments/update/'+model.id
					break;
				case 'delete':
					options.url = '/admin/mrg_admin_uploader/attachments/delete/'+model.id
					break;
			}

			return Backbone.sync.apply(this, arguments);
		}
	})

	image = new AttachmentModel({
		url:'/admin/mrg_admin_uploader/attachments.json'
	});

    let imageRotationTemplate = '';

    if(enableImageRotation){
    	imageRotationTemplate = `
    		<div style="display: flex; justify-content: space-between">
				<button class="btn rotate-left"><i class="fa fa-rotate-left"></i></button>
				<% if (rotation > 0) { %>
					<% if (saving === true) {%>
					<button class="btn btn-success" disabled="disabled">Saving...</button>
					<% } else { %>
					<button class="btn btn-success save-rotation">Save Rotation</button>
					<% } %>
				<% } %>
				<button class="btn rotate-right"><i class="fa fa-rotate-right"></i></button>
			</div>
    	`
	}

	AttachmentView = Backbone.View.extend({
		className: 'pod',
		initialize: function(){
			this.model.on('delete', this.deleteImage, this);
			this.model.on('change', this.render, this);
			this.model.on('sync', function (model, resposne) {
				this.model.set('rotation', 0);
				this.model.set('saving', false);
			}.bind(this), this);
		},
		template: _.template(
			`<div class="image_holder" style="transform: rotate(<%= rotation %>deg);"><img src="<%= thumb %>" alt="<%= name %>" /></div>
			<div style="display:none;" property="id"><%= id %></div>
			${imageRotationTemplate}
			<h4 property="title" class="title">Title<br /><input class="form-control" name="title" value="<%= title %>" /></h4>
			<p property="caption" class="caption">Comments<br /><input class="form-control" name="caption" value="<%= caption %>" /></p>
			<div class="btn btn-danger delete">Delete</div>`
		),
		events:{
			"click img":"_ckselect",
			"click .delete":"deleteImage",
			"click .rotate-left": "rotateLeft",
			"click .rotate-right": "rotateRight",
			"click .save-rotation": "saveRotation",
			"drop":"reorder",
			'change input[name="title"]' : 'updateAttachment',
			'change input[name="caption"]' : 'updateAttachment'
		},

		render: function () {
			var attributes = this.model.toJSON();
			this.$el.html(this.template(attributes));
			this.$el.attr({'typeOf':'Image', 'about':'/admin/mrg_admin_uploader/attachments/'+this.model.get('id')});

			return this;
		},

		updateAttachment : function (e) {
			parent = $(e.target).closest('.pod')
			title = parent.find('input[name="title"]').val();
			caption = parent.find('input[name="caption"]').val();
			attachment = new AttachmentModel({id:this.model.get('id'), title:title, caption:caption});
			attachment.save();
		},

		deleteImage: function () {
			if (confirm('Are you sure you want to delete this image?')) {
				this.model.destroy();
				this.remove();
			}
		},
		// Needs to be refactored
		reorder : function (event, index) {
			ids = [];
			i = 0
			$('.image_collection').find('[property=id]').each(function () {
				ids.push({Attachment:{id:$(this).html(),order_by:i}});
				i++;
			});
			$.ajax({url:'/admin/mrg_admin_uploader/attachments/update_order',data: {data:ids}, method:'post'});
		},

		rotateLeft: function (e) {
			e.preventDefault();
			this.rotateImage(-90);
		},

		rotateRight: function (e) {
			e.preventDefault();
			this.rotateImage(90);
		},

		rotateImage: function (deg) {
			let rotation = this.model.get('rotation');
			rotation += deg;
			if(rotation < 0){
				rotation = 360 + rotation;
			}
			if(rotation === 360){
				rotation = 0;
			}
			this.model.set('rotation', rotation);
		},

		saveRotation: function (e) {
			e.preventDefault();
			this.model.set('saving', true);
			const policy = filestackSignature.getFilestackPolicy(moment().unix() + 500, ['convert', 'store']);
			const signature = filestackSignature.getFilestackSignature(policy, filestackSecret)
			const rotation = this.model.get('rotation');
			const cdnUrl = `https://cdn.filestackcontent.com/ABNjhyUWiSVyynPgT99BEz`;
			const rotatedUrl = [cdnUrl];
			const security = `security=p:${policy},s:${signature}`;
			rotatedUrl.push(security);
			rotatedUrl.push(`rotate=deg:${rotation}`);
			rotatedUrl.push(`store=location:s3,container:heavy-crane-salvage,access:public`);
			rotatedUrl.push(this.model.get('img'));

			$.ajax({
				url: rotatedUrl.join('/'),
				complete: function (response) {
					this.model.set('img', 'https://s3.amazonaws.com/heavy-crane-salvage/' + response.responseJSON.key);
					this.model.save();
				}.bind(this)
			});
		},

		// return the selected image back to ckeditor
		_ckselect: function () {
			//if (typeof CKeditorFuncNum != 'undefined') {
				//window.opener.CKEDITOR.tools.callFunction(CKEditorFuncNum, this.model.get('original'));
				//window.close();
			//}else{
				// Not working needs help with choosing a specific image
				//console.log(';here');
				//window.selected_image = this.model.get('original');
				//$('.image_editor_overlay').trigger('choose_image');
			//}
		}
	});

	ImageList = Backbone.Collection.extend({
		url: '/admin/mrg_admin_uploader/attachments.json',
		model:AttachmentModel,
		comparator: function(model) {
			return model.get('order_by');
		},
		parse: function (response){
			return response.attachments
		}
	});



	attachmentList = new ImageList();

	attachmentList.fetch({data:{foreign_key:attachment_foreign_key, model:attachment_foreign_model}});

	AttachmentListView = Backbone.View.extend({
		className:'image_collection',
		initialize: function (){
			var list = this;
			this.collection.on('add', this.addOne, this);
			this.collection.on('reset', this.addAll, this);
			$(window).on('finished_upload', function () {
				attachmentList.fetch({data:{foreign_key:attachment_foreign_key, model:attachment_foreign_model}});
			})

		},

		addOne: function(image){
			var imageView = new AttachmentView({model:image});
			this.$el.attr({'rel':'hasPart', 'about':'/admin/mrg_admin_uploader/attachments/', 'draggable':true});
			this.$el.append(imageView.render().el);
		},
		addAll: function (){
			this.collection.forEach(this.addOne, this);
		},


		render: function (){
			this.$el.children().remove();
			this.addAll();
			return this;
		}
	})

	attachmentListView = new AttachmentListView({collection:attachmentList});

	attachmentListView.render();

	$('.attachments').html(attachmentListView.el);

	// Needs to be refactored
	$('.image_collection').sortable({stop:function (event, ui) {
		ui.item.trigger('drop');
	}});








});
