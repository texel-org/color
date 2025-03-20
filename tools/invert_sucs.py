import numpy as np

M = np.array([[1,0,0],[0,1,0],[0,0,1]])
Minv = np.linalg.inv(M)

XYZ_D65_to_sUCS_LMS_M = np.array([
  [0.4002, 0.7075, -0.0807],
  [-0.228, 1.15, 0.0612],
  [0.0, 0.0, 0.9184],
])

sUCS_LMS_POW_TO_sUCS_LAB_M = np.array([
  [200 / 3.05, 100 / 3.05, 5 / 3.05],
  [430, -470, 40],
  [49, 49, -98],
])

print('Inv LMS to XYZ:', np.linalg.inv(XYZ_D65_to_sUCS_LMS_M).tolist())
print('Inv sUCS_LMS to sUCS_LAB:', np.linalg.inv(sUCS_LMS_POW_TO_sUCS_LAB_M).tolist())
