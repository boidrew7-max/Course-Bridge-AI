/*!
 * CourseBridge branded loading overlay + intro splash
 * Zero dependencies. Safe to import in SSR (touches DOM only when called).
 *
 *   CourseBridge.showLoader({ messages, interval, minDuration })
 *   CourseBridge.hideLoader()            -> Promise (respects minDuration)
 *   CourseBridge.setMessage("text")
 *   CourseBridge.splash({ once })        // optional intro reveal; once: 'session'|'ever'|'always'
 */
(function (root) {
  'use strict';
  if (root.CourseBridge && root.CourseBridge.__cbLoaded) return;

  var PIECES = [{"id":"markC","color":"#ffffff","d":"M53.76,291.73C2.83,240.80 -10.74,166.73 18.92,101.51C29.41,78.43 47.14,55.82 67.45,39.63C88.73,22.66 107.54,13.63 136.67,6.38L147.50,3.68L217.81,3.27C271.35,2.95 288.47,3.14 289.56,4.05C291.83,5.93 291.69,63.52 289.42,64.39C288.55,64.73 260.20,65.00 226.42,65.00C159.81,65.00 154.68,65.33 139.00,70.63C103.72,82.55 78.50,109.97 68.77,146.99C65.55,159.27 65.51,185.95 68.69,197.00C76.14,222.81 86.64,238.53 109.89,258.70L113.29,261.65L101.00,271.07C89.96,279.54 85.52,283.16 75.49,291.88C66.47,299.71 64.85,301.00 63.98,301.00C63.45,301.00 58.85,296.83 53.76,291.73Z","tx":90.5,"ty":87.0,"cx":127.12,"cy":124.88,"bb":[91.25,87.75,163.0,162.0]},{"id":"archW","color":"#ffffff","d":"M3.96,202.46C2.59,200.80 2.16,201.54 13.85,185.50C29.97,163.38 49.55,139.69 65.00,123.63C78.96,109.11 90.69,97.85 106.12,84.13C129.01,63.79 162.07,42.94 193.50,29.03C196.25,27.82 199.40,26.41 200.50,25.92C214.25,19.72 246.03,10.53 264.50,7.42C281.70,4.51 285.00,4.16 301.84,3.45C318.56,2.74 318.79,2.76 319.46,4.87C319.83,6.04 321.00,7.47 322.07,8.04C324.53,9.35 324.84,18.06 322.50,20.00C321.19,21.08 321.00,29.78 321.00,87.04C321.00,123.23 320.73,153.55 320.39,154.42C319.51,156.72 305.49,156.72 304.61,154.42C304.27,153.55 304.00,127.92 304.00,97.48C304.00,60.67 303.66,41.91 302.97,41.48C301.58,40.62 277.71,43.59 266.00,46.08C254.24,48.59 232.50,55.52 227.34,58.41L223.50,60.56L223.00,108.03L222.50,155.50L215.09,155.80C209.83,156.01 207.44,155.72 206.85,154.80C206.40,154.08 206.02,135.15 206.02,112.72C206.00,75.68 205.85,71.88 204.34,71.30C202.63,70.65 202.19,70.87 192.36,77.37C170.55,91.79 142.32,119.64 122.28,146.52C121.06,148.16 116.62,154.68 112.41,161.00C108.20,167.32 103.98,173.63 103.02,175.02C102.07,176.40 99.79,180.45 97.95,184.02C92.28,195.05 86.92,203.00 85.16,202.98C84.25,202.97 65.86,203.16 44.30,203.40C11.96,203.75 4.90,203.58 3.96,202.46Z","tx":88.0,"ty":142.0,"cx":128.75,"cy":167.75,"bb":[88.75,142.75,168.75,192.75]},{"id":"markB","color":"#3fc5d3","d":"M273.00,339.25C273.00,338.77 272.21,337.50 271.25,336.43C270.29,335.36 267.05,331.57 264.05,327.99C261.05,324.42 252.96,315.76 246.09,308.75C239.21,301.73 233.21,295.33 232.75,294.52C232.27,293.66 232.60,290.75 233.54,287.52C240.68,262.93 226.52,232.31 202.60,220.64C191.55,215.26 188.12,214.94 142.08,214.98L100.66,215.03L88.58,212.07C66.50,206.65 59.57,205.17 51.00,204.02C46.33,203.39 38.73,202.23 34.12,201.44C29.51,200.65 21.41,199.99 16.12,199.98C10.83,199.98 5.83,199.54 5.00,199.02C3.69,198.19 3.48,186.21 3.31,102.36C3.18,39.81 3.46,6.00 4.12,4.78C5.09,2.96 7.90,2.91 93.81,3.24L182.50,3.58L191.24,6.31C211.23,12.56 223.76,20.06 237.04,33.72C246.87,43.83 249.97,48.20 255.67,60.00C264.42,78.15 267.00,89.28 267.00,109.00C267.00,132.16 261.29,152.00 249.51,169.80L246.77,173.95L258.71,185.72C271.22,198.07 273.15,200.41 279.56,211.00C291.65,230.96 295.48,245.99 295.49,273.50C295.50,297.61 292.31,311.79 282.51,331.22C279.01,338.15 277.90,339.55 275.67,339.82C274.20,339.99 273.00,339.74 273.00,339.25ZM180.47,149.03C187.74,146.02 197.58,136.76 201.24,129.50C206.96,118.12 207.07,99.99 201.47,88.95C198.40,82.88 190.08,73.82 184.68,70.66C175.43,65.24 172.59,65.00 117.14,65.00C67.67,65.00 66.04,65.06 65.04,66.93C63.44,69.91 63.63,149.23 65.23,150.83C66.19,151.79 78.70,152.00 120.48,151.78L174.50,151.50L180.47,149.03Z","tx":170.0,"ty":87.0,"cx":207.25,"cy":129.75,"bb":[170.75,87.75,243.75,171.75]},{"id":"archT","color":"#3fc5d3","d":"M221.88,202.00C220.94,201.18 218.74,197.12 216.99,193.00C212.63,182.71 209.70,176.72 205.03,168.50C202.84,164.65 200.31,160.15 199.40,158.50C197.76,155.50 187.95,140.66 181.76,131.79C169.68,114.50 143.57,89.35 125.50,77.59C120.55,74.37 115.38,70.97 114.00,70.04C109.24,66.82 88.47,57.14 81.00,54.67C69.81,50.97 59.99,48.17 55.50,47.41C53.30,47.04 50.83,46.39 50.00,45.97C49.17,45.55 44.23,44.69 39.00,44.07C27.35,42.68 27.00,42.31 27.00,31.50C27.00,20.25 26.82,20.08 14.00,19.72L3.50,19.42L3.50,11.46L3.50,3.50L19.50,3.78C29.13,3.94 40.68,4.85 48.50,6.06C55.65,7.16 63.30,8.33 65.50,8.65C67.70,8.97 74.67,10.57 81.00,12.21C87.33,13.85 93.85,15.54 95.50,15.96C100.44,17.23 117.11,23.00 123.00,25.47C144.84,34.65 155.36,39.67 164.00,45.05C164.82,45.56 167.25,47.00 169.39,48.24C219.14,77.19 271.07,131.10 303.03,187.00C305.39,191.12 308.15,195.57 309.16,196.88C311.00,199.27 311.66,202.98 310.25,203.02C309.84,203.03 290.17,203.14 266.55,203.27C229.58,203.47 223.36,203.29 221.88,202.00Z","tx":167.25,"ty":142.0,"cx":206.38,"cy":167.75,"bb":[168.0,142.75,244.75,192.75]},{"id":"pierT","color":"#3fc5d3","d":"M5.25,90.44C3.67,89.29 3.51,85.72 3.32,47.84C3.21,25.10 3.35,5.71 3.63,4.75C3.91,3.79 4.95,3.00 5.94,3.00C8.16,3.00 17.05,7.84 18.72,9.95C20.51,12.22 20.54,89.89 18.75,90.46C15.12,91.60 6.82,91.59 5.25,90.44Z","tx":187.75,"ty":158.25,"cx":190.5,"cy":170.0,"bb":[188.5,159.0,192.5,181.0]},{"id":"w0_C","color":"#ffffff","d":"M64.53,171.87C35.49,164.15 14.80,142.81 5.80,111.32C3.28,102.53 2.66,77.22 4.77,69.50C9.25,53.06 10.75,49.52 17.77,38.65C32.52,15.83 56.76,3.00 85.13,3.00C111.24,3.00 132.78,13.12 147.24,32.19C155.84,43.53 155.80,44.08 146.00,49.08C142.43,50.90 138.75,53.02 137.83,53.78C134.85,56.25 131.83,54.81 127.85,49.00C118.11,34.80 103.86,27.60 85.50,27.59C62.51,27.58 44.07,39.30 35.01,59.69C25.69,80.66 27.75,108.20 40.01,126.36C54.83,148.32 85.68,156.20 110.00,144.26C115.40,141.60 126.06,131.92 131.20,125.00L133.80,121.50L140.15,124.93C150.37,130.44 154.00,132.93 154.00,134.43C154.00,137.26 141.98,151.93 135.27,157.28C120.27,169.25 105.36,174.09 84.17,173.86C75.38,173.77 69.37,173.16 64.53,171.87Z","tx":265.0,"ty":121.25,"cx":284.5,"cy":143.25,"bb":[265.75,122.0,303.25,164.5]},{"id":"w1_o","color":"#ffffff","d":"M50.00,126.03C25.20,119.19 9.72,102.83 4.49,77.93C-1.28,50.53 12.58,21.75 37.35,9.67C75.43,-8.90 118.67,12.32 127.45,53.89C132.79,79.14 119.24,108.06 96.38,120.21C82.81,127.43 63.75,129.82 50.00,126.03ZM77.50,102.30C102.62,94.29 111.15,59.85 93.19,38.99C88.00,32.96 82.38,29.73 73.27,27.54C56.95,23.60 40.11,32.08 32.60,47.99C29.75,54.02 29.53,55.32 29.51,65.50C29.50,79.24 32.13,85.99 40.62,94.03C51.32,104.15 63.29,106.83 77.50,102.30Z","tx":305.5,"ty":132.75,"cx":321.88,"cy":149.0,"bb":[306.25,133.5,337.5,164.5]},{"id":"w2_u","color":"#ffffff","d":"M33.96,124.07C19.89,119.65 11.63,111.46 5.81,96.16C3.74,90.74 3.63,88.64 3.27,47.59C3.04,20.83 3.26,4.46 3.86,4.09C5.91,2.82 26.22,3.74 27.11,5.14C27.58,5.89 27.98,22.73 27.98,42.57C28.00,72.69 28.26,79.53 29.60,84.07C36.26,106.64 66.76,108.62 77.62,87.19L80.50,81.50L80.79,43.84C81.04,12.28 81.33,5.97 82.55,4.96C83.95,3.80 104.51,3.17 105.59,4.26C106.34,5.01 106.30,120.70 105.56,121.91C104.60,123.46 84.76,123.36 83.20,121.80C82.54,121.14 82.00,118.66 82.00,116.30C82.00,110.97 80.38,110.70 75.78,115.25C65.87,125.07 48.65,128.70 33.96,124.07Z","tx":341.25,"ty":133.25,"cx":354.88,"cy":149.25,"bb":[342.0,134.0,367.75,164.5]},{"id":"w3_r","color":"#ffffff","d":"M4.44,122.90C3.20,120.90 3.49,7.11 4.73,5.87C5.94,4.66 25.04,4.29 26.90,5.44C27.51,5.81 28.00,8.54 28.00,11.50C28.00,18.63 29.29,19.09 34.08,13.64C39.22,7.81 46.79,4.22 55.73,3.39C66.56,2.38 67.00,2.86 67.00,15.50C67.00,27.76 67.21,27.52 56.00,28.22C42.84,29.04 34.75,35.17 30.65,47.43C29.25,51.62 29.00,57.41 29.00,86.24C29.00,107.69 28.62,120.84 27.96,122.07C27.04,123.80 25.78,124.00 16.02,124.00C9.15,124.00 4.87,123.59 4.44,122.90Z","tx":374.0,"ty":133.0,"cx":382.62,"cy":148.75,"bb":[374.75,133.75,390.5,163.75]},{"id":"w4_s","color":"#ffffff","d":"M37.71,126.01C23.54,122.23 10.96,112.91 5.09,101.81C2.27,96.48 2.71,94.57 7.21,92.69C9.02,91.93 13.09,90.04 16.24,88.49C21.82,85.76 22.05,85.73 23.99,87.50C25.10,88.49 26.00,89.93 26.00,90.68C26.00,92.96 33.89,100.77 38.39,102.95C43.54,105.44 52.76,106.51 60.61,105.53C72.07,104.10 78.78,93.08 72.82,85.50C69.95,81.85 63.04,78.90 47.38,74.63C40.29,72.70 32.50,70.39 30.06,69.50C1.79,59.19 0.48,22.44 27.89,8.56C41.66,1.58 62.54,1.49 76.58,8.36C83.46,11.72 92.59,20.26 95.55,26.10L97.97,30.88L95.24,32.81C91.12,35.71 81.58,40.00 79.25,40.00C77.97,40.00 76.43,38.70 75.16,36.55C72.72,32.41 66.06,27.40 60.98,25.88C54.77,24.02 43.07,25.10 39.13,27.91C32.57,32.58 31.56,40.27 36.81,45.56C40.45,49.22 45.53,51.26 59.97,54.87C80.60,60.02 93.62,68.21 97.55,78.48C99.96,84.81 99.23,100.86 96.27,106.55C87.55,123.29 60.84,132.17 37.71,126.01Z","tx":392.25,"ty":132.75,"cx":404.88,"cy":149.0,"bb":[393.0,133.5,416.75,164.5]},{"id":"w5_e","color":"#ffffff","d":"M47.50,125.57C36.79,122.52 33.46,120.95 26.32,115.58C16.72,108.37 10.53,99.69 5.91,87.00C2.24,76.93 2.39,52.61 6.17,42.35C12.86,24.21 24.69,12.45 42.13,6.59C75.72,-4.68 109.67,13.68 116.62,46.89C118.44,55.60 118.47,70.37 116.66,71.87C115.74,72.63 102.06,73.06 72.41,73.24L29.50,73.50L29.19,76.22C28.71,80.35 34.32,91.12 39.38,95.79C47.45,103.22 50.99,104.50 63.50,104.50C76.74,104.50 80.23,103.04 89.38,93.70L95.26,87.68L103.70,92.09C114.06,97.50 114.62,98.09 113.01,101.98C111.14,106.49 97.91,118.51 91.46,121.56C77.51,128.16 61.66,129.61 47.50,125.57ZM91.82,49.74C92.52,43.65 84.17,32.23 75.79,27.83C69.53,24.53 54.63,24.57 47.62,27.89C41.02,31.02 34.52,37.76 31.49,44.61C27.60,53.41 26.38,53.07 61.38,52.76L91.50,52.50L91.82,49.74Z","tx":420.0,"ty":132.75,"cx":435.0,"cy":149.0,"bb":[420.75,133.5,449.25,164.5]},{"id":"b0_B","color":"#3fc5d3","d":"M4.64,165.50C2.31,163.17 2.10,5.99 4.42,4.07C5.47,3.19 15.38,2.98 42.67,3.26C77.25,3.60 79.88,3.76 85.74,5.78C104.64,12.31 113.95,24.69 114.78,44.36C115.34,57.89 112.89,65.35 104.98,74.23C99.33,80.57 99.11,81.27 102.29,82.72C116.60,89.24 125.73,114.07 120.41,132.00C115.72,147.79 105.12,158.50 88.50,164.26C82.93,166.18 79.77,166.36 44.39,166.74C10.03,167.11 6.13,166.98 4.64,165.50ZM80.53,143.50C86.56,141.79 93.25,136.33 96.27,130.64C98.04,127.32 98.48,124.83 98.49,118.00C98.50,108.59 96.85,104.83 89.86,98.41C83.39,92.47 80.15,91.93 52.42,92.23L27.50,92.50L27.23,118.00C27.02,138.62 27.23,143.69 28.33,144.50C30.49,146.08 74.38,145.24 80.53,143.50ZM78.50,68.62C87.74,64.25 92.00,57.43 92.00,47.00C92.00,39.53 90.42,35.58 85.50,30.82C79.37,24.88 73.56,23.84 48.50,24.20L27.50,24.50L27.23,46.93C27.02,64.20 27.25,69.54 28.23,70.16C28.93,70.61 39.40,70.97 51.50,70.97C72.56,70.98 73.71,70.88 78.50,68.62Z","tx":455.25,"ty":122.25,"cx":470.75,"cy":143.38,"bb":[456.0,123.0,485.5,163.75]},{"id":"b1_r","color":"#3fc5d3","d":"M4.20,121.80C2.51,120.11 2.46,5.45 4.15,4.41C6.27,3.10 23.23,3.76 24.14,5.19C24.60,5.91 24.70,8.58 24.37,11.12C23.53,17.63 25.09,17.93 31.30,12.45C38.57,6.05 45.75,3.09 54.19,3.04C58.50,3.01 61.16,3.44 61.66,4.25C62.70,5.93 62.88,21.08 61.88,23.10C61.32,24.23 59.06,24.90 54.29,25.35C43.17,26.41 40.18,27.66 34.00,33.85C25.41,42.45 25.00,44.87 25.00,86.76C25.00,111.75 24.69,120.91 23.80,121.80C23.05,122.55 19.36,123.00 14.00,123.00C8.64,123.00 4.95,122.55 4.20,121.80Z","tx":490.0,"ty":133.25,"cx":498.12,"cy":148.88,"bb":[490.75,134.0,505.5,163.75]},{"id":"b2_i","color":"#3fc5d3","d":"M8.21,168.15C6.82,167.27 5.79,51.88 7.15,50.52C8.37,49.29 25.17,49.40 26.87,50.65C28.34,51.72 28.50,57.34 28.50,109.10C28.50,155.22 28.24,166.61 27.18,167.68C25.69,169.16 10.40,169.54 8.21,168.15ZM12.50,29.59C1.02,24.49 0.64,9.11 11.87,4.41C18.29,1.72 24.37,3.40 28.50,9.01C36.58,19.96 24.83,35.07 12.50,29.59Z","tx":508.25,"ty":121.75,"cx":512.38,"cy":143.12,"bb":[509.0,122.5,515.75,163.75]},{"id":"b3_d","color":"#3fc5d3","d":"M48.35,169.54C17.05,163.31 -3.50,127.25 5.02,93.50C8.15,81.09 11.87,74.20 20.08,65.55C27.80,57.43 38.60,51.24 48.80,49.11C55.31,47.75 68.03,47.71 73.77,49.03C79.94,50.46 90.85,55.84 94.36,59.20C96.04,60.80 98.25,61.96 99.32,61.79C101.17,61.51 101.25,60.41 101.24,34.50C101.22,1.27 100.63,2.92 112.53,3.14C117.74,3.24 121.39,3.77 122.01,4.51C123.68,6.52 123.50,167.07 121.83,168.13C121.10,168.59 116.82,168.98 112.32,168.98C102.39,169.00 100.68,167.88 101.62,161.97C102.92,153.86 101.02,153.66 92.00,160.96C80.77,170.05 65.76,173.00 48.35,169.54ZM78.66,146.89C96.97,138.05 105.82,117.85 100.12,97.91C96.95,86.82 89.35,77.32 79.55,72.18C72.46,68.47 56.21,68.35 48.52,71.96C24.84,83.07 18.86,118.46 37.26,138.59C41.94,143.72 48.06,147.48 54.38,149.11C60.26,150.64 73.39,149.44 78.66,146.89Z","tx":519.25,"ty":121.75,"cx":535.0,"cy":143.38,"bb":[520.0,122.5,550.0,164.25]},{"id":"b4_g","color":"#3fc5d3","d":"M53.50,172.04C41.84,170.93 31.48,166.17 22.31,157.71C17.35,153.15 11.00,144.16 11.00,141.72C11.00,139.85 15.59,136.01 17.88,135.97C18.77,135.95 21.30,135.06 23.50,134.00C29.10,131.30 29.37,131.38 33.52,137.16C41.50,148.27 47.73,151.27 63.00,151.37C71.78,151.42 74.24,151.08 78.00,149.28C89.91,143.58 95.78,134.43 96.70,120.15C97.56,106.90 95.93,103.10 91.50,108.00C85.99,114.08 71.63,119.24 60.00,119.30C33.20,119.46 8.77,99.91 4.09,74.57C0.07,52.73 5.42,33.61 19.52,19.52C31.90,7.13 44.87,2.35 63.54,3.27C74.81,3.82 83.66,7.07 89.98,12.98C94.60,17.29 96.38,16.66 97.00,10.49L97.50,5.50L107.42,5.21C114.68,5.00 117.55,5.27 118.15,6.21C118.60,6.92 118.98,33.96 118.98,66.30C119.00,129.94 118.73,133.76 113.45,143.69C102.13,164.98 81.54,174.72 53.50,172.04ZM68.20,96.88C79.60,94.46 89.16,87.06 93.90,77.00C97.86,68.62 97.71,53.16 93.58,44.20C90.30,37.07 83.53,30.31 76.14,26.78C70.09,23.90 53.32,23.61 48.50,26.31C46.85,27.23 45.04,27.99 44.48,27.99C42.42,28.01 33.15,37.09 30.97,41.23C24.31,53.89 24.42,70.88 31.24,81.54C39.12,93.83 53.81,99.93 68.20,96.88Z","tx":554.0,"ty":133.0,"cx":569.12,"cy":154.88,"bb":[554.75,133.75,583.5,176.0]},{"id":"b5_e","color":"#3fc5d3","d":"M47.57,124.50C28.30,120.29 12.57,105.05 5.76,84.00C2.66,74.39 2.67,54.24 5.78,44.63C10.21,30.96 20.63,16.54 29.59,11.68C42.26,4.82 48.97,2.99 61.30,3.02C81.81,3.09 97.44,12.23 107.76,30.22C113.13,39.58 117.30,66.53 113.99,70.51C112.83,71.91 107.79,72.07 70.21,71.95C37.67,71.83 27.57,72.09 26.99,73.02C25.19,75.93 30.19,87.66 36.05,94.32C41.27,100.25 47.16,103.58 54.92,104.98C69.23,107.58 85.12,101.24 90.61,90.75C91.40,89.24 92.60,87.99 93.28,87.98C95.18,87.94 110.91,96.33 111.42,97.66C112.84,101.36 98.05,116.06 88.00,120.95C78.35,125.64 60.11,127.24 47.57,124.50ZM90.83,51.34C92.79,47.83 88.31,37.53 82.33,31.86C75.81,25.66 70.84,23.76 61.00,23.71C46.19,23.65 36.32,29.98 29.83,43.71C25.23,53.43 23.84,53.00 59.57,53.00C86.75,53.00 90.00,52.83 90.83,51.34Z","tx":587.25,"ty":133.0,"cx":601.88,"cy":149.0,"bb":[588.0,133.75,615.75,164.25]}];
  var SVGNS = 'http://www.w3.org/2000/svg';

  // ---------- easing ----------
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function outCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function outQuart(x) { return 1 - Math.pow(1 - x, 4); }
  function outQuint(x) { return 1 - Math.pow(1 - x, 5); }
  function inOutQuint(x) { return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2; }
  function outBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function bell(t, a, peak, b) { return t < a ? 0 : t < peak ? outCubic(seg(t, a, peak)) : 1 - outCubic(seg(t, peak, b)); }

  var THEMES = {
    light: {
      bg: 'radial-gradient(110% 80% at 85% -10%, rgba(63,197,211,.13), rgba(63,197,211,0) 60%),' +
          'radial-gradient(90% 60% at 50% 120%, rgba(158,138,100,.10), rgba(158,138,100,0) 70%),' +
          'linear-gradient(150deg,#fbfaf7 0%,#f6f3ec 55%,#efe9dd 100%)',
      ink: '#16324a', teal: '#29acc0',
      msg: 'rgba(54,58,64,.72)',
      cableStroke: '#79c7d2', cableDot: '#63bfcd', pulse: '#0e96a8', pulseOp: '0.85',
      dotFlash: [14,150,168], dotBase: [99,191,205],
      glowA: '0.20', glowB: '0.07'
    },
    dark: {
      bg: 'radial-gradient(120% 90% at 84% -12%, rgba(31,140,160,.55), rgba(20,96,124,.20) 45%, rgba(20,96,124,0) 70%),' +
          'radial-gradient(90% 70% at 50% 125%, rgba(14,74,116,.35), rgba(14,74,116,0) 70%),' +
          'linear-gradient(160deg,#020e22 0%,#062038 55%,#0a2c4a 100%)',
      ink: '#ffffff', teal: '#3fc5d3',
      msg: 'rgba(233,246,250,.82)',
      cableStroke: '#7fd2de', cableDot: '#8fdbe6', pulse: '#aeeef7', pulseOp: '0.9',
      dotFlash: [233,249,255], dotBase: [143,219,230],
      glowA: '0.40', glowB: '0.15'
    }
  };

  var reduceMotion = false;
  try { reduceMotion = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  // ---------- state ----------
  var st = null;   // active overlay state

  function buildOverlay(mode, T) {
    var doc = root.document;
    var overlay = doc.createElement('div');
    overlay.setAttribute('data-coursebridge-overlay', mode);
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;gap:0;' +
      'background:' + T.bg + ';' +
      // Backdrop is OPAQUE from the first frame (opacity:1), so the page
      // behind it is never visible for even a split second while the loader
      // comes up. The branded content inside still animates in smoothly (see
      // the content/logo/message opacity animations), and the exit still
      // fades out over the transition below — only the see-through ENTRANCE
      // is removed.
      'opacity:1;transition:opacity .55s cubic-bezier(.25,.6,.35,1);pointer-events:all;';

    // --- lockup svg (viewBox tight on logo, banner coords) ---
    var svg = doc.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '78 70 546 130');
    svg.setAttribute('aria-label', 'CourseBridge');
    svg.style.cssText = 'width:min(64vw,540px);height:auto;display:block;overflow:visible;';

    var defs = doc.createElementNS(SVGNS, 'defs');
    defs.innerHTML =
      '<radialGradient id="cbMarkGlow" cx="0.5" cy="0.5" r="0.5">' +
      '<stop offset="0" stop-color="' + T.teal + '" stop-opacity="' + T.glowA + '"/>' +
      '<stop offset="0.55" stop-color="' + T.teal + '" stop-opacity="' + T.glowB + '"/>' +
      '<stop offset="1" stop-color="' + T.teal + '" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="cbWipeEdge" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>' +
      '<mask id="cbArchMask" maskUnits="userSpaceOnUse" x="60" y="60" width="560" height="200">' +
      '<rect id="cbMSolid" x="82" y="60" width="0" height="200" fill="#fff"/>' +
      '<rect id="cbMEdge" x="82" y="60" width="26" height="200" fill="url(#cbWipeEdge)"/></mask>';
    svg.appendChild(defs);

    var lockup = doc.createElementNS(SVGNS, 'g');
    var markGroup = doc.createElementNS(SVGNS, 'g');
    var archPair = doc.createElementNS(SVGNS, 'g');
    archPair.setAttribute('mask', 'url(#cbArchMask)');

    var glow = doc.createElementNS(SVGNS, 'ellipse');
    glow.setAttribute('cx', '166.75'); glow.setAttribute('cy', '140.25');
    glow.setAttribute('rx', '150'); glow.setAttribute('ry', '112');
    glow.setAttribute('fill', 'url(#cbMarkGlow)'); glow.setAttribute('opacity', '0');
    markGroup.appendChild(glow);
    markGroup.appendChild(archPair);

    var el = {}, letters = [];
    PIECES.forEach(function (p) {
      var wrap = doc.createElementNS(SVGNS, 'g');
      var g = doc.createElementNS(SVGNS, 'g');
      g.setAttribute('transform', 'translate(' + p.tx + ',' + p.ty + ') scale(0.25)');
      var path = doc.createElementNS(SVGNS, 'path');
      path.setAttribute('d', p.d); path.setAttribute('fill', p.color === '#ffffff' ? T.ink : T.teal);
      g.appendChild(path); wrap.appendChild(g);
      el[p.id] = { wrap: wrap, cx: p.cx, cy: p.cy };
      if (p.id === 'archW' || p.id === 'archT') archPair.appendChild(wrap);
      else if (p.id[0] === 'w' || p.id[0] === 'b') { lockup.appendChild(wrap); letters.push(el[p.id]); }
      else markGroup.appendChild(wrap);
    });
    lockup.insertBefore(markGroup, lockup.firstChild);
    svg.appendChild(lockup);

    // --- cable svg: full width strip below the lockup ---
    var cableWrap = doc.createElementNS(SVGNS, 'svg');
    cableWrap.setAttribute('viewBox', '0 0 1200 150');
    cableWrap.setAttribute('preserveAspectRatio', 'none');
    cableWrap.setAttribute('aria-hidden', 'true');
    cableWrap.style.cssText = 'position:absolute;left:0;right:0;top:calc(50% + min(11vw,96px));width:100%;height:150px;opacity:0;';
    var CD = 'M -40 96 Q 430 34 1240 62';
    function qpoint(t) {
      var P0 = { x: -40, y: 96 }, P1 = { x: 430, y: 34 }, P2 = { x: 1240, y: 62 };
      return { x: (1-t)*(1-t)*P0.x + 2*(1-t)*t*P1.x + t*t*P2.x,
               y: (1-t)*(1-t)*P0.y + 2*(1-t)*t*P1.y + t*t*P2.y };
    }
    var cablePath = doc.createElementNS(SVGNS, 'path');
    cablePath.setAttribute('d', CD); cablePath.setAttribute('fill', 'none');
    cablePath.setAttribute('stroke', T.cableStroke); cablePath.setAttribute('stroke-width', '1.6');
    cablePath.setAttribute('pathLength', '1');
    cablePath.setAttribute('stroke-dasharray', '1'); cablePath.setAttribute('stroke-dashoffset', '1');
    cablePath.setAttribute('opacity', '0.5');
    cableWrap.appendChild(cablePath);
    var pulse = doc.createElementNS(SVGNS, 'path');
    pulse.setAttribute('d', CD); pulse.setAttribute('fill', 'none');
    pulse.setAttribute('stroke', T.pulse); pulse.setAttribute('stroke-width', '2.6');
    pulse.setAttribute('stroke-linecap', 'round'); pulse.setAttribute('pathLength', '1');
    pulse.setAttribute('stroke-dasharray', '0.085 0.915');
    pulse.setAttribute('stroke-dashoffset', '1'); pulse.setAttribute('opacity', '0');
    cableWrap.appendChild(pulse);
    var dots = [];
    for (var i = 0; i < 9; i++) {
      var a = 0.09 + i * 0.101;
      var pt = qpoint(a);
      var c = doc.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); c.setAttribute('r', '3.4');
      c.setAttribute('fill', T.cableDot);
      cableWrap.appendChild(c);
      dots.push({ c: c, a: a, pt: pt });
    }

    // --- message ---
    var msg = doc.createElement('div');
    msg.style.cssText =
      'position:absolute;left:0;right:0;top:calc(50% + min(11vw,96px) + 108px);text-align:center;' +
      'font:500 15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
      'color:' + T.msg + ';letter-spacing:.04em;opacity:0;transition:opacity .2s ease;' +
      'padding:0 24px;';
    var msgText = doc.createElement('span');
    var msgDots = doc.createElement('span');
    msgDots.style.cssText = 'display:inline-block;width:1.2em;text-align:left;';
    msg.appendChild(msgText); msg.appendChild(msgDots);

    var content = doc.createElement('div');
    content.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
      'opacity:0;transform:translateY(10px);transition:opacity .5s cubic-bezier(.25,.6,.35,1),transform .6s cubic-bezier(.25,.6,.35,1);';
    content.appendChild(svg);
    content.appendChild(cableWrap);
    content.appendChild(msg);
    overlay.appendChild(content);

    return {
      overlay: overlay, content: content, el: el, letters: letters, markGroup: markGroup, glow: glow, T: T,
      mSolid: defs.querySelector('#cbMSolid'), mEdge: defs.querySelector('#cbMEdge'),
      cableWrap: cableWrap, cablePath: cablePath, pulse: pulse, dots: dots,
      msg: msg, msgText: msgText, msgDots: msgDots
    };
  }

  // ---------- shared entrance render (0..ENTR_END seconds) ----------
  var MARKC = { x: 166.75, y: 140.25 }, LOCKC = 352.25, SLIDE = LOCKC - MARKC.x;

  function renderEntrance(o, t, T) {
    // T: timing table
    var aw = outQuart(seg(t, T.arch[0], T.arch[1]));
    var wx = 82 + 194 * aw;
    o.mSolid.setAttribute('width', String(Math.max(0, wx - 82 - 26 + 1)));
    o.mEdge.setAttribute('x', String(wx - 26));

    var pp = outCubic(seg(t, T.pier[0], T.pier[1]));
    var P = o.el.pierT;
    P.wrap.setAttribute('opacity', String(pp));
    P.wrap.setAttribute('transform', 'translate(' + P.cx + ',159) scale(1,' + pp + ') translate(' + (-P.cx) + ',-159)');

    mLetter(o.el.markC, seg(t, T.C[0], T.C[1]));
    mLetter(o.el.markB, seg(t, T.B[0], T.B[1]));

    var bloom = 0.5 * bell(t, T.bloom[0], T.bloom[1], T.bloom[2]);
    o.glow.setAttribute('opacity', String(bloom));

    var grow = 0.985 + 0.015 * outCubic(seg(t, T.grow[0], T.grow[1]));
    var slide = SLIDE * (1 - inOutQuint(seg(t, T.slide[0], T.slide[1])));
    o.markGroup.setAttribute('transform',
      'translate(' + slide + ',0) translate(' + MARKC.x + ',' + MARKC.y + ') scale(' + grow + ') translate(' + (-MARKC.x) + ',' + (-MARKC.y) + ')');

    o.letters.forEach(function (L, i) {
      var p = seg(t, T.let0 + i * T.letStep, T.let0 + i * T.letStep + T.letDur);
      var e = outCubic(p);
      L.wrap.setAttribute('opacity', String(Math.min(1, p * 1.6)));
      L.wrap.setAttribute('transform', 'translate(' + (-7 * (1 - e)) + ',' + (9 * (1 - e)) + ')');
      L.wrap.style.filter = p > 0 && p < 1 ? 'blur(' + (3 * (1 - e)) + 'px)' : '';
    });

    var cd = outQuint(seg(t, T.cable[0], T.cable[1]));
    o.cablePath.setAttribute('stroke-dashoffset', String(1 - cd));
    o.cableWrap.style.opacity = String(0.85 * seg(t, T.cable[0], T.cable[0] + 0.4));
    o.dots.forEach(function (d) {
      var pop = outBack(seg(t, T.cable[0] + 0.15 + d.a * (T.cable[1] - T.cable[0] - 0.2), T.cable[0] + 0.15 + d.a * (T.cable[1] - T.cable[0] - 0.2) + 0.2));
      d.c.setAttribute('transform', 'translate(' + d.pt.x + ',' + d.pt.y + ') scale(' + pop + ') translate(' + (-d.pt.x) + ',' + (-d.pt.y) + ')');
    });
  }

  function mLetter(P, p) {
    var e = outCubic(p);
    P.wrap.setAttribute('opacity', String(Math.min(1, p * 1.5)));
    P.wrap.setAttribute('transform', 'translate(0,' + (14 * (1 - e)) + ')');
    P.wrap.style.filter = p > 0 && p < 1 ? 'blur(' + (4 * (1 - e)) + 'px)' : '';
  }

  // fast entrance for the loader
  var T_LOADER = {
    arch: [0.05, 0.50], pier: [0.42, 0.58], C: [0.24, 0.62], B: [0.34, 0.74],
    bloom: [0.40, 0.75, 1.35], grow: [0.08, 0.75], slide: [0.62, 1.00],
    let0: 0.70, letStep: 0.026, letDur: 0.28, cable: [0.12, 0.88]
  };
  var LOADER_ENTR_END = 1.35, LOOP_PERIOD = 2.8;

  // slower, cinematic pacing for the splash (mirrors the video)
  var T_SPLASH = {
    arch: [0.22, 1.06], pier: [0.88, 1.10], C: [0.55, 1.18], B: [0.82, 1.45],
    bloom: [0.95, 1.5, 2.5], grow: [0.3, 1.5], slide: [1.58, 2.16],
    let0: 1.76, letStep: 0.055, letDur: 0.46, cable: [0.10, 1.35]
  };
  var SPLASH_END = 3.9;

  function renderLoop(o, tl) {
    // tl: seconds since loop start; seamless period
    var ph = (tl % LOOP_PERIOD) / LOOP_PERIOD;
    o.pulse.setAttribute('opacity', o.T.pulseOp);
    o.pulse.setAttribute('stroke-dashoffset', String(1 - ph));
    var center = (ph + 0.0425) % 1;
    o.dots.forEach(function (d) {
      var dd = Math.abs(d.a - center);
      var dist = Math.min(dd, 1 - dd);
      var near = clamp(1 - dist / 0.06, 0, 1);
      var F = o.T.dotFlash, B = o.T.dotBase;
      d.c.setAttribute('fill', near > 0 ? 'rgb(' + Math.round(B[0] + near * (F[0]-B[0])) + ',' + Math.round(B[1] + near * (F[1]-B[1])) + ',' + Math.round(B[2] + near * (F[2]-B[2])) + ')' : o.T.cableDotStr || (o.T.cableDotStr = 'rgb(' + B.join(',') + ')'));
      var s = 1 + 0.5 * near;
      d.c.setAttribute('transform', 'translate(' + d.pt.x + ',' + d.pt.y + ') scale(' + s + ') translate(' + (-d.pt.x) + ',' + (-d.pt.y) + ')');
    });
    o.glow.setAttribute('opacity', String(0.13 + 0.05 * Math.sin(tl * 2 * Math.PI / LOOP_PERIOD)));
  }

  function startTicker(o, mode, opts) {
    var start = null, msgIdx = 0, lastMsgSwap = 0;
    var msgs = opts.messages && opts.messages.length ? opts.messages.slice() : null;
    function frame(now) {
      if (!st || st.o !== o) return;
      if (start === null) { start = now; lastMsgSwap = now; }
      var t = (now - start) / 1000;

      if (reduceMotion) {
        renderEntrance(o, 99, mode === 'splash' ? T_SPLASH : T_LOADER); // final state
        o.cablePath.setAttribute('stroke-dashoffset', '0');
        o.cableWrap.style.opacity = '0.85';
        o.glow.setAttribute('opacity', '0.13');
      } else if (mode === 'splash') {
        renderEntrance(o, t, T_SPLASH);
      } else {
        renderEntrance(o, Math.min(t, LOADER_ENTR_END), T_LOADER);
        if (t > LOADER_ENTR_END) renderLoop(o, t - LOADER_ENTR_END);
      }

      // message ellipsis + rotation (loader only)
      if (mode === 'loader') {
        var nd = 1 + Math.floor(t / 0.45) % 3;
        o.msgDots.textContent = '...'.slice(0, nd);
        if (msgs && msgs.length > 1 && now - lastMsgSwap > (opts.interval || 1500)) {
          lastMsgSwap = now;
          msgIdx = (msgIdx + 1) % msgs.length;
          var span = o.msgText;
          o.msg.style.opacity = '0';
          setTimeout(function () {
            span.textContent = msgs[msgIdx];
            o.msg.style.opacity = '1';
          }, 210);
        }
      }

      if (mode === 'splash' && t >= (reduceMotion ? 0.9 : SPLASH_END)) { api.hideLoader(); return; }
      o.raf = root.requestAnimationFrame(frame);
    }
    o.raf = root.requestAnimationFrame(frame);
  }

  // ---------- public API ----------
  var api = {
    __cbLoaded: true,
    version: '1.0.0',

    showLoader: function (opts) {
      opts = opts || {};
      if (typeof root.document === 'undefined') return;
      var mode = opts.__mode || 'loader';
      var theme = THEMES[opts.theme] ? opts.theme : 'light';
      if (st) {
        if (st.mode === 'splash' && mode === 'loader') {
          var old = st; st = null;
          if (old.o.raf) root.cancelAnimationFrame(old.o.raf);
          if (old.o.overlay.parentNode) old.o.overlay.parentNode.removeChild(old.o.overlay);
          root.document.body.style.overflow = old.prevOverflow;
        } else {
          if (opts.messages && opts.messages.length) st.o.msgText.textContent = opts.messages[0];
          return;
        }
      }
      var o = buildOverlay(mode, THEMES[theme]);
      var msgs = opts.messages && opts.messages.length ? opts.messages : ['Building your plan'];
      o.msgText.textContent = mode === 'loader' ? msgs[0] : '';
      root.document.body.appendChild(o.overlay);
      var prevOverflow = root.document.body.style.overflow;
      root.document.body.style.overflow = 'hidden';
      st = { o: o, shownAt: Date.now(), minDuration: opts.minDuration != null ? opts.minDuration : 1500, prevOverflow: prevOverflow, mode: mode };
      // fade in + reveal message shortly after
      root.requestAnimationFrame(function () {
        o.overlay.style.opacity = '1';
        o.content.style.opacity = '1';
        o.content.style.transform = 'translateY(0)';
        if (mode === 'loader') setTimeout(function () { o.msg.style.opacity = '1'; }, reduceMotion ? 50 : 600);
      });
      startTicker(o, mode, opts);
    },

    hideLoader: function () {
      if (!st) return Promise.resolve();
      var s = st;
      var wait = Math.max(0, s.minDuration - (Date.now() - s.shownAt));
      return new Promise(function (resolve) {
        setTimeout(function () {
          if (st !== s) { resolve(); return; }
          var o = s.o;
          o.content.style.transition = 'opacity .28s ease, transform .34s cubic-bezier(.4,0,.7,1)';
          o.content.style.opacity = '0';
          o.content.style.transform = 'translateY(-8px)';
          setTimeout(function () { o.overlay.style.opacity = '0'; }, 220);
          setTimeout(function () {
            if (o.raf) root.cancelAnimationFrame(o.raf);
            if (o.overlay.parentNode) o.overlay.parentNode.removeChild(o.overlay);
            root.document.body.style.overflow = s.prevOverflow;
            if (st === s) st = null;
            resolve();
          }, 740);
        }, wait);
      });
    },

    setMessage: function (text) {
      if (!st) return;
      var o = st.o;
      o.msg.style.opacity = '0';
      setTimeout(function () { o.msgText.textContent = text; o.msg.style.opacity = '1'; }, 360);
    },

    splash: function (opts) {
      opts = opts || {};
      if (typeof root.document === 'undefined') return;
      var once = opts.once || 'session';
      try {
        if (once === 'session' && root.sessionStorage.getItem('cb_splash_v1')) return;
        if (once === 'ever' && root.localStorage.getItem('cb_splash_v1')) return;
        if (once === 'session') root.sessionStorage.setItem('cb_splash_v1', '1');
        if (once === 'ever') root.localStorage.setItem('cb_splash_v1', '1');
      } catch (e) {}
      if (reduceMotion) return; // respect users who opt out of motion
      this.showLoader({ __mode: 'splash', minDuration: 0, theme: opts.theme });
    }
  };

  root.CourseBridge = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {}));
