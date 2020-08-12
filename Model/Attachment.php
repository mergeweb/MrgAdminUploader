<?php
	App::uses('AppModel', 'Model');
/**
 * List Model
 *
 * @property Node $Node
 */
class Attachment extends AppModel {

	var $actsAs = array(
		'Uploader.Attachment' => array(
			'img'=>array(
				'finalPath'=> '/files/images/',
				'aspect'=>false,
				'transforms'=>array(
					'resized'=>array(
						'method' => 'crop',
						'append' => '-resized',
						'expand'=>false,
						'aspect'=>false,
						'overwrite' => false,
						'self' => false,
						'width' => 1170,
						'height'=> 510,
						'location'=>'center'
					),
					'thumb'=>array(
						'method' => 'crop',
						'append' => '-thumb',
						'self' => false,
						'width' => 192,
						'height' => 192,
						'location'=>'center'
					)
				),
                'nameCallback' => 'hashAttachmentFilename'
			),
			'file'=>[
				'finalPath'=> '/files/docs/',
				'dbColumn'=>'img'
			]
		),
		// Persist our coordintates
		// Requires Uploader
		// Overrides the location setting
		'MrgAdminUploader.CropCoordinates'
	);


	/**
		*  Function Name: beforeUpload
		*  Description: This is called by the uploader plugin
		*  This sets the correct location for the crop
		*  Date Added: Mon, Aug 19, 2013
	*/
	function beforeUpload($options){
		// I wish I could do this here but this has to be done in the controller
		//if(empty($this->data[$this->alias]['img']['name']) && !empty($this->data[$this->alias]['image_storage'])){
		//	// No new file was uploaded so lets persist the old one.
		//	// If they made transformations, we will catch that too.
		//	$this->data[$this->alias]['img'] = 'http://'.$_SERVER['SERVER_NAME'].$this->data[$this->alias]['image_storage'];
		//}
		return $this->editableImageBeforeUpload($options);
	}

    /**
     * Hash the filename for the attachment
     * This is to greatly reduce probability of naming collision when uploading files to S3
     * @param $filename
     * @return string
     */
	function hashAttachmentFilename($filename) {
        return md5(time() . '_' . $filename) . '.' . pathinfo($filename, PATHINFO_EXTENSION);
    }
}
?>
