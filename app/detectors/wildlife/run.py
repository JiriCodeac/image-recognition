import json
import os
import sys
import time
import humanfriendly

from detection.Detector import Detector

def main(arguments):
    source_images_path = arguments[0]
    picture_list = os.listdir(source_images_path)
    pictures = list(map(lambda name: source_images_path + '/' + name, picture_list))

    start_video_time = time.time()

    detector = Detector('/var/lib/md_v5a.0.0.pt')

    try:
        results = detector.process_images(pictures, 0.35)
    except Exception as error:
        print(error)
        print('ERROR: We were not able to process {}. Skipping analysis'.format(source_images_path))
        return

    elapsed = time.time() - start_video_time
    print('{}: analysis took {}'.format(source_images_path, humanfriendly.format_timespan(elapsed)))

    with open(source_images_path + '/output.json', 'w', encoding ='utf8') as file:
        json.dump(results, file, indent=1)
        file.close()


if __name__ == "__main__":
    main(sys.argv[1:])
