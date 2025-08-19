<?php
	App::uses('Helper', 'View');


	class ImageEditorHelper extends AppHelper{

		var $helpers = array('Html', 'Form', 'Js');

		function init($model, $instructions='', $id='image_upload', $image_uploader_options = []){
			// Load our required assets
			$this->Html->css('MrgAdminUploader.image_editor', 'stylesheet', ['inline'=>false]);
			$this->Html->css('MrgAdminUploader.imageareaselect/imgareaselect-animated', 'stylesheet', ['inline'=>false]);
//			$this->Html->script('MrgAdminUploader.jquery.upload.1.0.2', ['inline'=>false]);
//			$this->Html->script('MrgAdminUploader.image_editor_widget', ['inline'=>false]);
//			$this->Html->script('MrgAdminUploader.imageareaselect/jquery.imgareaselect', ['inline'=>false]);


			list($parent_model, $image_model) = explode('.',$model);
			$plural_class_name = Inflector::underscore(Inflector::pluralize($image_model));

			// We need to instantiate the javascript
			// $this->Js->writeBuffer(); required in the view

			$this->Js->buffer("jQuery('#".$id.".".$plural_class_name."').image_uploader(".json_encode($image_uploader_options).");");


			return
			$this->Html->div('',
				$this->Html->tag('span',
				$this->Form->input($image_model.'.img', array('type'=>'file', 'id'=>$id, 'class'=>$plural_class_name)).
				$this->Form->input($image_model.'.model', array('type'=>'hidden', 'value'=>$parent_model)).
				$this->Form->input($image_model.'.id', array('type'=>'hidden', 'value'=>(!empty($this->data[$image_model]['id']))?$this->data[$image_model]['id']:'')).
				$this->Html->tag('p', $instructions, array('style'=>'margin:0;')).
				$this->Form->hidden($image_model.'.image_storage', array('id'=>'image_storage', 'value'=>(isset($this->data[$image_model])) ? $this->data[$image_model]['img']:'')).
				$this->Form->hidden($image_model.'.crop_x1', array('id'=>'crop_x')).
				$this->Form->hidden($image_model.'.crop_y1', array('id'=>'crop_y')).
				$this->Form->hidden($image_model.'.crop_width', array('id'=>'crop_width')).
				$this->Form->hidden($image_model.'.crop_height', array('id'=>'crop_height')).
				$this->Html->image((!empty($this->data[$image_model]['img'])) ? $this->data[$image_model]['img']:'no_image.gif', array('id'=>'image_select', 'width'=>'300px', 'alt'=>'Choose an image and it will appear here'))),
				array('id'=>'editing_tools', 'style'=>'display:none;')
			);
		}

		/**
		 * the editor box
		 * this will diplsay the editor
		 *
		 * Date Added: Thu, Feb 13, 2014
		 */

		function editor($data = []){
			if((!empty($data['Image']['resized']) && file_exists(WWW_ROOT.$data['Image']['resized']))){
				$image = $this->Html->image( $this->data['Image']['resized']);
				$delete = $this->Html->link('Delete Image', 'javascript:void(0)', array('class'=>'btn btn-danger delete_image', 'onclick'=>'$("#image_upload.images").image_uploader("delete_image", this)'));
			}else{
				$image = '<div class="no_image" style="text-align:center; padding-top:10%; width:100%; background:#efefef; border:solid 1px #333; min-height:200px;">--No Image--</div>';
				$delete = '';
			}

			return
				$this->Html->div('image_editing_box',
					$this->Html->div('editing_options',
						$this->Html->link('Edit Image', 'javascript:void(0)', array('class'=>'btn btn-primary edit_image', 'onclick'=>'$("#image_upload.images").image_uploader("enable_image_editing", this)')).
						$delete
					).
					$image
				);
		}

		/**
		 * Multi File Uploader
		 *
		 * Date Added: Fri, Jan 24, 2014
		 */

		function multi_file_init($foreign_key_id = 0, $model){
			$this->Html->css('MrgAdminUploader.multifile_uploader', 'stylesheet', array("inline"=>false));
//			$this->Html->script('MrgAdminUploader.jquery.filedrop', array("inline"=>false));
//			$this->Html->script('MrgAdminUploader.jquery.nested_sortable', array("inline"=>false));
//			$this->Html->script('MrgAdminUploader.multifile_uploader', array("inline"=>false));
			return
				$this->Html->div('',
					$this->Html->div('message',
						'Drop images here to upload. <br />'.
						$this->Html->link('Click here to add files', 'javascript:void(0)', ['class' => 'add-files-link'])
					),
					['id'=>'dropbox']
				).
				// Hidden file input used by jquery.filedrop as a fallback when clicking the drop area
				$this->Form->file('dropzone', ['id' => 'dropzone', 'multiple' => true, 'accept' => 'image/*', 'style' => 'position:absolute;left:-9999px;width:0;height:0;opacity:0;']).
				$this->Html->scriptBlock('window.attachment_foreign_key = '.$foreign_key_id.'; window.attachment_foreign_model = "'.$model.'";').
				$this->Html->scriptBlock("(function(){ function attach(){ var dropbox = document.getElementById('dropbox'); if(!dropbox){ return; } dropbox.addEventListener('click', function(e){ var t = e.target; if(t && t.classList && t.classList.contains('add-files-link')){ e.preventDefault(); e.stopPropagation(); var input = document.getElementById('dropzone'); if(input){ input.click(); } } }); } if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', attach); } else { attach(); } })();").
				$this->Html->div('attachments', '');

		}

		/**
		 * single field init
		 * special options that will be passed to the upload function
		 * @option callback - A javascript function that will be called after upload
		 * @option types - what file types are accepted
		 *
		 * Date Added: Fri, Mar 28, 2014
		 */

		function single_file_upload($name = 'upload', $options){
			$this->Html->script('MrgAdminUploader.jquery.upload.1.0.2', ['inline'=>false]);
			$options = array_merge(['name'=>$name, 'callback'=>'after_single_file_upload', 'label'=>'Upload'], $options);
			$json_options = json_encode($options);
			$url = '/mrg_admin_uploader/attachments/file_upload/';
			$this->Js->buffer("
				$('#".$name."_upload_button').click(function () {
					$('#".$name."').click();
				})

				$('#".$name."').change(function () {
					$(this).upload(
						'".$url."',".$json_options.",
						// Once the upload has completed we need to process it
						function(res) {
							res = $.parseJSON(res);
							if(res.status){
								var files = this.files;
								var name = files[0].name;
								document.querySelector('#".$name."_file').innerHTML = name;
								$('<input id=\"'+res.field+'_url\" type=\"hidden\" value=\"'+res.url+'\" name=\"data['+res.model+']['+res.field+'_url]\" />').insertAfter('#'+res.field);
								$('#".$name."_close').click(function () {
									$('#".$name."').val('');
									$('.".$name."_single_file_list').hide();
									$('#'+res.field+'_url').remove();
								})
								$('.".$name."_single_file_list').show();
							}

							".$options['callback']."(res);
						}.bind(this))
				});
			");
			return
				$this->Html->tag('div',	$options['label'], array('class'=>'btn btn-primary', 'id'=>$name.'_upload_button')).
				$this->Form->file($name, array('name'=>$name, 'id'=>$name)).
				$this->Html->div($name.'_single_file_list',
					$this->Html->tag('span','', array('class'=>'single_file_title', 'id'=>$name.'_file')).
					$this->Html->image('MrgAdminUploader.close.png', array('class'=>'single_file_close_button', 'id'=>$name.'_close')),
					['style'=>'display:none;']
				);
		}
	}

?>
