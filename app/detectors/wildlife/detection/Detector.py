import time
import humanfriendly

from .PTDetector import PTDetector
from .visualization_utils import load_image

class Detector:
    def __init__(self, model_path):
        self.model_path = model_path
        start_time = time.time()
        self.pt_detector = PTDetector(model_path)
        elapsed = time.time() - start_time
        print('Loaded model (batch level) in {}'.format(humanfriendly.format_timespan(elapsed)))

    def process_images(self, images, confidence_threshold: float):
        results = []
        iterator = 1
        total = len(images)
        total_time = 0

        for image in images:
            start_frame_time = time.time()
            result = self.process_image(image, confidence_threshold)
            elapsed = time.time() - start_frame_time
            result['duration'] = elapsed
            total_time += elapsed

            print_results = ''
            if len(result['detections']) > 0:
                print_results = result['detections']
                results.append(result)

            percentage = round(iterator / total * 100)
            iterator += 1
            message = '{: >2}% {}: analysis took {} {}'
            print(message.format(percentage, image, humanfriendly.format_timespan(elapsed), print_results))
        return {
            'frames': results,
            'avgTime': total_time / total,
        }

    def process_image(self, im_file: str, confidence_threshold):
        """Runs the MegaDetector over a single image file.

        Args
        - im_file: str, path to image file
        - tf_detector: TFDetector, loaded model
        - confidence_threshold: float, only detections above this threshold are returned

        Returns:
        - result: dict representing detections on one image
            see the 'images' key in https://github.com/microsoft/CameraTraps/tree/master/api/batch_processing#batch-processing-api-output-format
        """

        try:
            image = load_image(im_file)
        except Exception as e:
            print('Image {} cannot be loaded. Exception: {}'.format(im_file, e))
            return {
                'file': im_file,
                'failure': PTDetector.FAILURE_IMAGE_OPEN
            }

        try:
            result = self.pt_detector.generate_detections_one_image(
                image,
                im_file,
                detection_threshold=confidence_threshold
            )

            amount = 0
            for detection in result['detections']:
                if detection['category'] == PTDetector.LABEL_VEHICLE:
                    continue
                amount += 1

            if amount < 1:
                result['detections'] = []
        except Exception as e:
            print('Image {} cannot be processed. Exception: {}'.format(im_file, e))
            return {
                'file': im_file,
                'failure': PTDetector.FAILURE_INFER
            }

        return result
