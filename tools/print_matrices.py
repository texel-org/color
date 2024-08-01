# -*- coding: utf-8 -*-

"""
Copyright (c) 2021 Björn Ottosson

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

**Overview**

This script is pulled from Coloraide, and modified slightly by @mattdesl for JS output.
  https://github.com/facelessuser/coloraide

The gamut approximation code was originally developed by Björn Ottosson.

Original file is located at
    https://colab.research.google.com/drive/1JdXHhEyjjEE--19ZPH1bZV_LiGQBndzs

This notebook was used to compute coefficients for the compute_max_saturation function in this blog post:
  http://bottosson.github.io/posts/gamutclipping/

The code is available for reference, since it could be useful to derive coefficients for other color spaces. It was
written quickly to derive the values and both structure and documentation is poor.
"""

# Commented out `IPython` magic to ensure Python compatibility.
import numpy as np
import scipy.optimize
import matplotlib.pyplot as plt
import sys
import os
import json
from coloraide import algebra as alg
sys.path.insert(0, os.getcwd())

# Use higher precision Oklab conversion matrix along with LMS matrix with our exact white point
from tools.calc_oklab_matrices import xyzt_white_d65, xyzt_white_d50, xyzt_get_matrix, SRGBL_TO_LMS, LMS_TO_SRGBL, LMS3_TO_OKLAB, OKLAB_TO_LMS3, XYZ_TO_LMS, LMS_TO_XYZ, LMS_TO_XYZD50, XYZD50_TO_LMS # noqa: E402

PRINT_DIAGS = False

def print_matrix (a, b, arr):
  data = json.dumps(arr.tolist(), indent=2, separators=(',', ': '))
  suffix = '_M'
  print(f'export const {a}_to_{b}{suffix} = {data};\n')


def print_json (label, data):
  str = json.dumps(data, indent=2, separators=(',', ': '))
  print(f'export const {label} = {str};\n')


# RGBL_TO_XYZD50, XYZD50_TO_RGBL = xyzt_get_matrix(xyzt_white_d50, 'prophoto-rgb')
# RGBL_TO_XYZD65, XYZD65_TO_RGBL = xyzt_get_matrix(xyzt_white_d65, 'prophoto-rgb')

# D65_to_D50_M = [
#   [1.0479297925449969, 0.022946870601609652, -0.05019226628920524],
#   [0.02962780877005599, 0.9904344267538799, -0.017073799063418826],
#   [-0.009243040646204504, 0.015055191490298152, 0.7518742814281371],
# ]

# D50_to_D65_M = [
#   [0.955473421488075, -0.02309845494876471, 0.06325924320057072],
#   [-0.0283697093338637, 1.0099953980813041, 0.021041441191917323],
#   [0.012314014864481998, -0.020507649298898964, 1.330365926242124],
# ]

# # print_matrix('RGBL', 'XYZD50',  np.asfarray(RGBL_TO_XYZD50))
# # print_matrix('RGBL', 'XYZD65',  np.asfarray(RGBL_TO_XYZD65))

# print_matrix('XYZD50', 'RGBL', np.asfarray(XYZD50_TO_RGBL))
# # print_matrix('XYZD65', 'RGBL', np.asfarray(XYZD65_TO_RGBL))

# XYZD65_TO_RGBL_2 = alg.matmul(D50_to_D65_M, XYZD50_TO_RGBL)

# print_matrix('XYZD65', 'RGBL_2',  np.asfarray(XYZD65_TO_RGBL_2))

# # print("HELLO", RGBL_TO_XYZ)
# exit()

def do_calc(GAMUT = 'srgb'):
  global SRGBL_TO_LMS, LMS_TO_SRGBL, LMS3_TO_OKLAB, OKLAB_TO_LMS3, XYZ_TO_LMS, LMS_TO_XYZD50, XYZD50_TO_LMS
  np.set_printoptions(precision=8)

  var_name = 'linear_sRGB'
  if GAMUT == 'display-p3':
    var_name = 'linear_DisplayP3'
  elif GAMUT == 'rec2020':
    var_name = 'linear_Rec2020'
  elif GAMUT == 'a98-rgb':
    var_name = 'linear_A98RGB'
  elif GAMUT == 'prophoto-rgb':
    var_name = 'linear_ProPhotoRGB'

  white = xyzt_white_d50 if GAMUT == 'prophoto-rgb' else xyzt_white_d65
  whitepoint = 'D50' if GAMUT == 'prophoto-rgb' else 'D65'
  RGBL_TO_XYZ, XYZ_TO_RGBL = xyzt_get_matrix(white, GAMUT)

  if GAMUT == 'a98-rgb':
    # convert an array of linear-light a98-rgb values to CIE XYZ
    # http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
    # has greater numerical precision than section 4.3.5.3 of
    # https://www.adobe.com/digitalimag/pdfs/AdobeRGB1998.pdf
    # but the values below were calculated from first principles
    # from the chromaticity coordinates of R G B W
    RGBL_TO_XYZ = [
      [ 0.5766690429101305,   0.1855582379065463,   0.1882286462349947  ],
      [ 0.29734497525053605,  0.6273635662554661,   0.07529145849399788 ],
      [ 0.02703136138641234,  0.07068885253582723,  0.9913375368376388  ],
    ]

    XYZ_TO_RGBL = [
      [  2.0415879038107465,    -0.5650069742788596,   -0.34473135077832956 ],
      [ -0.9692436362808795,     1.8759675015077202,    0.04155505740717557 ],
      [  0.013444280632031142,  -0.11836239223101838,   1.0151749943912054  ],
    ]

  # Calculate the gamut <-> LMS matrices to adjust the working gamut
  if GAMUT == 'srgb':
      RGBL_TO_LMS = SRGBL_TO_LMS
      LMS_TO_RGBL = LMS_TO_SRGBL
  elif GAMUT == 'prophoto-rgb':
      #  override from https://github.com/w3c/csswg-drafts/issues/7675
      RGBL_TO_XYZ = [
        [ 0.79776664490064230,  0.13518129740053308,  0.03134773412839220 ],
        [ 0.28807482881940130,  0.71183523424187300,  0.00008993693872564 ],
        [ 0.00000000000000000,  0.00000000000000000,  0.82510460251046020 ]
      ]
      XYZ_TO_RGBL = [
        [  1.34578688164715830, -0.25557208737979464, -0.05110186497554526 ],
        [ -0.54463070512490190,  1.50824774284514680,  0.02052744743642139 ],
        [  0.00000000000000000,  0.00000000000000000,  1.21196754563894520 ]
      ]
      RGBL_TO_LMS = alg.matmul(XYZD50_TO_LMS, RGBL_TO_XYZ)
      LMS_TO_RGBL = alg.inv(RGBL_TO_LMS)
  else:
      RGBL_TO_LMS = alg.matmul(XYZ_TO_LMS, RGBL_TO_XYZ)
      LMS_TO_RGBL = alg.inv(RGBL_TO_LMS)

  def printarray (label, arr):
    print(label, '[ ' + ', '.join([str(n) for n in arr]) + ' ]')

  # print('RGBL_TO_LMS',RGBL_TO_LMS)
  # print('LMS_TO_RGBL', LMS_TO_RGBL)

  RGBL_TO_LMS = np.asfarray(RGBL_TO_LMS)
  LMS_TO_RGBL = np.asfarray(LMS_TO_RGBL)
  LMS3_TO_OKLAB = np.asfarray(LMS3_TO_OKLAB)
  OKLAB_TO_LMS3 = np.asfarray(OKLAB_TO_LMS3)

  def linear_srgb_to_oklab(c):
      l = RGBL_TO_LMS[0][0] * c[0, ...] + RGBL_TO_LMS[0][1] * c[1, ...] + RGBL_TO_LMS[0][2] * c[2, ...]
      m = RGBL_TO_LMS[1][0] * c[0, ...] + RGBL_TO_LMS[1][1] * c[1, ...] + RGBL_TO_LMS[1][2] * c[2, ...]
      s = RGBL_TO_LMS[2][0] * c[0, ...] + RGBL_TO_LMS[2][1] * c[1, ...] + RGBL_TO_LMS[2][2] * c[2, ...]

      l_ = np.cbrt(l)
      m_ = np.cbrt(m)
      s_ = np.cbrt(s)

      return np.array([
          LMS3_TO_OKLAB[0][0] * l_ + LMS3_TO_OKLAB[0][1] * m_ + LMS3_TO_OKLAB[0][2] * s_,
          LMS3_TO_OKLAB[1][0] * l_ + LMS3_TO_OKLAB[1][1] * m_ + LMS3_TO_OKLAB[1][2] * s_,
          LMS3_TO_OKLAB[2][0] * l_ + LMS3_TO_OKLAB[2][1] * m_ + LMS3_TO_OKLAB[2][2] * s_,
      ])

  # define functions for R, G and B as functions of S, h (with L = 1 and S = C/L)

  def to_lms(S, h):
    a = S * np.cos(h)
    b = S * np.sin(h)

    l_ = OKLAB_TO_LMS3[0][0] + OKLAB_TO_LMS3[0][1] * a + OKLAB_TO_LMS3[0][2] * b
    m_ = OKLAB_TO_LMS3[1][0] + OKLAB_TO_LMS3[1][1] * a + OKLAB_TO_LMS3[1][2] * b
    s_ = OKLAB_TO_LMS3[2][0] + OKLAB_TO_LMS3[2][1] * a + OKLAB_TO_LMS3[2][2] * b

    l = l_ * l_ * l_
    m = m_ * m_ * m_
    s = s_ * s_ * s_

    return (l, m, s)

  def to_lms_dS(S, h):
    a = S * np.cos(h)
    b = S * np.sin(h)

    l_ = OKLAB_TO_LMS3[0][0] + OKLAB_TO_LMS3[0][1] * a + OKLAB_TO_LMS3[0][2] * b
    m_ = OKLAB_TO_LMS3[1][0] + OKLAB_TO_LMS3[1][1] * a + OKLAB_TO_LMS3[1][2] * b
    s_ = OKLAB_TO_LMS3[2][0] + OKLAB_TO_LMS3[2][1] * a + OKLAB_TO_LMS3[2][2] * b

    l = (LMS3_TO_OKLAB[0][1] * np.cos(h) + LMS3_TO_OKLAB[0][1] * np.sin(h)) * 3 * l_* l_
    m = (LMS3_TO_OKLAB[1][1] * np.cos(h) + LMS3_TO_OKLAB[1][1] * np.sin(h)) * 3 * m_* m_
    s = (LMS3_TO_OKLAB[2][1] * np.cos(h) + LMS3_TO_OKLAB[2][1] * np.sin(h)) * 3 * s_* s_

    return (l, m, s)

  def to_lms_dS2(S, h):
    a = S * np.cos(h)
    b = S * np.sin(h)

    l_ = OKLAB_TO_LMS3[0][0] + OKLAB_TO_LMS3[0][1] * a + OKLAB_TO_LMS3[0][2] * b
    m_ = OKLAB_TO_LMS3[1][0] + OKLAB_TO_LMS3[1][1] * a + OKLAB_TO_LMS3[1][2] * b
    s_ = OKLAB_TO_LMS3[2][0] + OKLAB_TO_LMS3[2][1] * a + OKLAB_TO_LMS3[2][2] * b

    l = (LMS3_TO_OKLAB[0][1] * np.cos(h) + LMS3_TO_OKLAB[0][2] * np.sin(h)) ** 2 * 6 * l_
    m = (LMS3_TO_OKLAB[1][1] * np.cos(h) + LMS3_TO_OKLAB[0][2] * np.sin(h)) ** 2 * 6 * m_
    s = (LMS3_TO_OKLAB[2][1] * np.cos(h) + LMS3_TO_OKLAB[0][2] * np.sin(h)) ** 2 * 6 * s_

    return (l, m, s)


  def to_R(S, h):
    (l, m, s) = to_lms(S, h)
    return LMS_TO_RGBL[0][0] * l + LMS_TO_RGBL[0][1] * m + LMS_TO_RGBL[0][2] * s

  def to_R_dS(S, h):
    (l, m, s) = to_lms_dS(S, h)
    return LMS_TO_RGBL[0][0] * l + LMS_TO_RGBL[0][1] * m + LMS_TO_RGBL[0][2] * s

  def to_R_dS2(S, h):
    (l, m, s) = to_lms_dS2(S, h)
    return LMS_TO_RGBL[0][0] * l + LMS_TO_RGBL[0][1] * m + LMS_TO_RGBL[0][2] * s

  def to_G(S, h):
    (l, m, s) = to_lms(S, h)
    return LMS_TO_RGBL[1][0] * l + LMS_TO_RGBL[1][1] * m + LMS_TO_RGBL[1][2] * s

  def to_G_dS(S, h):
    (l, m, s) = to_lms_dS(S, h)
    return LMS_TO_RGBL[1][0] * l + LMS_TO_RGBL[1][1] * m + LMS_TO_RGBL[1][2] * s

  def to_G_dS2(S, h):
    (l, m, s) = to_lms_dS2(S, h)
    return LMS_TO_RGBL[1][0] * l + LMS_TO_RGBL[1][1] * m + LMS_TO_RGBL[1][2] * s

  def to_B(S, h):
    (l, m, s) = to_lms(S, h)
    return LMS_TO_RGBL[2][0] * l + LMS_TO_RGBL[2][1] * m + LMS_TO_RGBL[2][2] * s

  def to_B_dS(S, h):
    (l, m, s) = to_lms_dS(S, h)
    return LMS_TO_RGBL[2][0] * l + LMS_TO_RGBL[2][1] * m + LMS_TO_RGBL[2][2] * s

  def to_B_dS2(S, h):
    (l, m, s) = to_lms_dS2(S, h)
    return LMS_TO_RGBL[2][0] * l + LMS_TO_RGBL[2][1] * m + LMS_TO_RGBL[2][2] * s

  if GAMUT != 'prophoto-rgb':
    hs, Ss = np.meshgrid(np.linspace(-np.pi, np.pi, 720), np.linspace(0, 1, 200))

    Rs = to_R(Ss, hs)
    Gs = to_G(Ss, hs)
    Bs = to_B(Ss, hs)

    gamut = np.minimum(Rs, np.minimum(Gs, Bs))

    r_lab = linear_srgb_to_oklab(np.array([1, 0, 0]))
    g_lab = linear_srgb_to_oklab(np.array([0, 1, 0]))
    b_lab = linear_srgb_to_oklab(np.array([0, 0, 1]))

    r_h = np.arctan2(r_lab[2], r_lab[1])
    g_h = np.arctan2(g_lab[2], g_lab[1])
    b_h = np.arctan2(b_lab[2], b_lab[1])

    r_dir = 0.5 * np.array([np.cos(b_h) + np.cos(g_h), np.sin(b_h) + np.sin(g_h)])
    g_dir = 0.5 * np.array([np.cos(b_h) + np.cos(r_h), np.sin(b_h) + np.sin(r_h)])
    b_dir = 0.5 * np.array([np.cos(r_h) + np.cos(g_h), np.sin(r_h) + np.sin(g_h)])

    r_dir /= r_dir[0]** 2 + r_dir[1]** 2
    g_dir /= g_dir[0]** 2 + g_dir[1]** 2
    b_dir /= b_dir[0]** 2 + b_dir[1]** 2

    # These are coefficients to quickly test which component goes below zero first.
    # Used like this in compute_max_saturation:
    # if (-1.88170328f * a - 0.80936493f * b > 1) // Red component goes below zero first

    r_hs, r_Ss = np.meshgrid(np.linspace(g_h, 2 * np.pi + b_h, 200), np.linspace(0, 1, 200))

    r_Rs = to_R(r_Ss, r_hs)

    g_hs, g_Ss = np.meshgrid(np.linspace(b_h, r_h, 200), np.linspace(0, 1, 200))

    g_Gs = to_G(g_Ss, g_hs)

    b_hs, b_Ss = np.meshgrid(np.linspace(r_h, g_h, 200), np.linspace(0, 1, 200))

    b_Bs = to_B(b_Ss, b_hs)

    # These are numerical fits to the edge of the chroma
    # The resulting coefficient, x_R, x_G and x_B are used in compute_max_saturation, as values for k0
    its = 1

    resolution = 100000

    h = np.linspace(g_h, 2 * np.pi + b_h, resolution)
    a = np.cos(h)
    b = np.sin(h)

    def e_R(x):
      S = x[0] + x[1] * a + x[2] * b + x[3] * a ** 2 + x[4] * a * b
      S = np.maximum(0, S)

      # optimize for solution that is easiest to solve with one step Haley's method
      f = to_R(S, h)
      f1 = to_R_dS(S, h)
      f2 = to_R_dS2(S, h)
      S_1 = S - f * f1 / (f1 ** 2 - f * f2 / 2)

      f_ = to_R(S_1, h)
      return np.average(f_ ** 10) # + f_[0] ** 2 + f_[-1] ** 2

    x_R = scipy.optimize.minimize(e_R, np.array([1.19086277, 1.76576728, 0.59662641, 0.75515197, 0.56771245])).x

    # printarray('R COEFF', x_R)

    S_R = x_R[0] + x_R[1] * a + x_R[2] * b + x_R[3] * a ** 2 + x_R[4] * a * b

    S_R1 = S_R
    for i in range(0, its):
      f = to_R(S_R1, h)
      f1 = to_R_dS(S_R1, h)
      f2 = to_R_dS2(S_R1, h)
      S_R1 = S_R1 - f * f1 / (f1 ** 2 - f * f2 / (2))

      plt.plot(S_R1, 'r')

    #####

    h = np.linspace(b_h, r_h, resolution)
    a = np.cos(h)
    b = np.sin(h)

    def e_G(x):
      S = x[0] + x[1] * a + x[2] * b + x[3] * a ** 2 + x[4] * a * b
      S = np.maximum(0, S)

      # optimize for solution that is easiest to solve with one step Haley's method
      f = to_G(S, h)
      f1 = to_G_dS(S, h)
      f2 = to_G_dS2(S, h)
      S_1 = S - f * f1 / (f1 ** 2 - f * f2 / 2)

      f_ = to_G(S_1, h)
      return np.average(f_ ** 10) # + f_[0] ** 2 + f_[-1] ** 2

    x_G = scipy.optimize.minimize(e_G, np.array([0.73956515, -0.45954404,  0.08285427,  0.12541073, -0.14503204])).x

    # printarray('G COEFF', x_G)

    S_G = x_G[0] + x_G[1] * a + x_G[2] * b + x_G[3] * a ** 2 + x_G[4] * a * b

    S_G1 = S_G
    for i in range(0, its):
      f = to_G(S_G1, h)
      f1 = to_G_dS(S_G1, h)
      f2 = to_G_dS2(S_G1, h)
      S_G1 = S_G1 - f * f1 / (f1 ** 2 - f * f2 / (2))
      

    #####

    h = np.linspace(r_h, g_h, resolution)
    a = np.cos(h)
    b = np.sin(h)

    def e_B(x):
      S = x[0] + x[1] * a + x[2] * b + x[3] * a ** 2 + x[4] * a * b
      S = np.maximum(0, S)

      # optimize for solution that is easiest to solve with one step Haley's method
      f = to_B(S, h)
      f1 = to_B_dS(S, h)
      f2 = to_B_dS2(S, h)
      S_1 = S - f * f1 / (f1 ** 2 - f * f2 / 2)

      f_ = to_B(S_1, h)
      return np.average(f_ ** 10) # + f_[0] ** 2 + f_[-1] ** 2

    x_B = scipy.optimize.minimize(e_B, np.array([1.35733652, -0.00915799, -1.1513021,  -0.50559606,  0.00692167])).x

    # printarray('B COEFF', x_B)

    S_B = x_B[0] + x_B[1] * a + x_B[2] * b + x_B[3] * a ** 2 + x_B[4] * a * b

    S_B1 = S_B
    for i in range(0, its):
      f = to_B(S_B1, h)
      f1 = to_B_dS(S_B1, h)
      f2 = to_B_dS2(S_B1, h)
      S_B1 = S_B1 - f * f1 / (f1 ** 2 - f * f2 / (2))

  print(f'// {var_name} space\n')
    
  print(f'// {var_name} to XYZ ({whitepoint}) matrices\n')
  print_matrix(var_name, 'XYZ', np.asfarray(RGBL_TO_XYZ))
  print_matrix('XYZ', var_name, np.asfarray(XYZ_TO_RGBL))
  
  print(f'// {var_name} to LMS matrices\n')
  print_matrix(var_name, 'LMS', RGBL_TO_LMS)
  print_matrix('LMS', var_name, LMS_TO_RGBL)
  
  if GAMUT != 'prophoto-rgb':
    coeff = [
      [
        r_dir.tolist(),
        x_R.tolist(),
      ],
      [
        g_dir.tolist(),
        x_G.tolist()
      ],
      [
        b_dir.tolist(),
        x_B.tolist()
      ]
    ]
    print(f'// {var_name} coefficients for OKLab gamut approximation\n')
    print_json(f'OKLab_to_{var_name}_coefficients', coeff)
  else:
    print(f'// {var_name} does not yet support OKLab gamut approximation\n')

# print things...

print(f'/** This file is auto-generated by tools/print_matrices.py */\n')
print(f'// OKLab to LMS matrices\n')
print_matrix('OKLab', 'LMS', np.asfarray(OKLAB_TO_LMS3))
print_matrix('LMS', 'OKLab', np.asfarray(LMS3_TO_OKLAB))
print_matrix('XYZ', 'LMS', np.asfarray(XYZ_TO_LMS))
print_matrix('LMS', 'XYZ', np.asfarray(LMS_TO_XYZ))

# don't need these...
# print_matrix('XYZD50', 'LMS', np.asfarray(XYZD50_TO_LMS))
# print_matrix('LMS', 'XYZD50', np.asfarray(LMS_TO_XYZD50))

for gamut in ['srgb', 'display-p3', 'rec2020', 'a98-rgb', 'prophoto-rgb']:
  d = do_calc(gamut)
