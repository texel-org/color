"""
Calculate `oklab` matrices.

Björn Ottosson, in his original calculations, used a different white point than
what CSS and most other people use. In the CSS repository, he commented on
how to calculate the M1 matrix using the exact same white point as CSS. He
provided the initial matrix used in this calculation, which we will call M0.
https://github.com/w3c/csswg-drafts/issues/6642#issuecomment-945714988.
This M0 matrix is used to create a precise matrix to convert XYZ to LMS using
the D65 white point as specified by CSS. Both ColorAide and CSS use the D65
chromaticity coordinates of `(0.31270, 0.32900)` which is documented and used
for sRGB as the standard. There are likely implementations unaware that the
they should, or even how to adapt the Oklab M1 matrix to their white point
as this is not documented in the author's Oklab blog post, but is buried in a
CSS repository discussion.

Additionally, the documented M2 matrix is specified as 32 bit values, and the
inverse is calculated directly from the this 32 bit matrix. The forward and
reverse transform is calculated to perfectly convert 32 bit values, but when
translating 64 bit values, the transform adds a lot of noise after about 7 - 8
digits (the precision of 32 bit floats). This is particularly problematic for
achromatic colors in Oklab and OkLCh and can cause chroma not to resolve to zero.

To provide an M2 matrix that works better for 64 bit, we take the inverse M2,
which provides a perfect transforms to white from Oklab `[1, 0, 0]` in 32 bit
floating point. We process the matrix as float 32 bit values and emit them as 64
bit double values, ~17 digit double accuracy. We then calculate the forward
matrix. This gives us a transform in 64 bit that drives chroma extremely close
to zero for 64 bit doubles and maintains the same 32 bit precision of up to about
7 digits, the 32 bit accuracy limit (~7.22).

To demonstrate that our 64 bit converted matrices work as we claim and does not
alter the intent of the values, we can observe by comparing the documented matrices
(adjusting for our white point).

Below we demonstrate by first using the documented 32 bit M2 matrix (adjusting the
M1 for our white point). This is what most implementations do, though some may not
properly correct the M1 matrix for their white point. Notice how the lightness for
white is only accurate up to about 7 digits making the expected value of 1 not very
accurate. Also notice that a and b do not resolve as close to 0. The a value is
pretty good, but the b value is substantially worse. Also notice the first 7 digits
(the 32 bit precision) for red, green, and blue as they will be used for comparison.

```
>>> from coloraide.everything import ColorAll as Color
>>> import numpy as np
>>> Color('white').convert('oklab')[:]
[0.9999999935000001, -1.6653345369377348e-16, 3.729999997759137e-08, 1.0]
>>> [np.float32(c) for c in Color('red').convert('oklab', norm=False)[:]]
[0.6279554, 0.22486307, 0.1258463, 1.0]
>>> [np.float32(c) for c in Color('green').convert('oklab', norm=False)[:]]
[0.51975185, -0.14030233, 0.107675895, 1.0]
>>> [np.float32(c) for c in Color('blue').convert('oklab', norm=False)[:]]
[0.4520137, -0.03245697, -0.31152815, 1.0]
```

When we use our 64 bit adjusted M2 matrix, we now get a precise 1 for lightness
when converting white and get zero or nearly zero for a and b. When comparing the
first 7 digits to the previous example we get the same values. Anything after
~7 digits is not guaranteed to be the same.

```
>>> from coloraide.everything import ColorAll as Color
>>> import numpy as np
>>> Color('white').convert('oklab')[:]
[1.0, -5.551115123125783e-17, 0.0, 1.0]
>>> [np.float32(c) for c in Color('red').convert('oklab', norm=False)[:]]
[0.6279554, 0.22486307, 0.12584628, 1.0]
>>> [np.float32(c) for c in Color('green').convert('oklab', norm=False)[:]]
[0.51975185, -0.14030233, 0.10767588, 1.0]
>>> [np.float32(c) for c in Color('blue').convert('oklab', norm=False)[:]]
[0.45201373, -0.032456975, -0.31152818, 1.0]
```

Okhsl is completely calculated using 32 bit floats as that is how the author
provided the algorithm, but we can see that when we calculate the new coefficients,
using our M1 and 64 bit adjusted M2 matrices, that we preserve the 32 precision.
Anything after ~7 digits is just noise due to the differences in 32 bit and 64 bit.

Comparing to the actual values returned using the author's code in his Okhsl and Okhsv
color pickers:

```
// Okhsl
> var value = srgb_to_okhsl(255, 255, 255); value[0] *= 360; value
[89.87556309590242, 0.5582831888483675, 0.9999999923961898]
> var value = srgb_to_okhsl(255, 0, 0); value[0] *= 360; value
[29.23388519234263, 1.0000000001433997, 0.5680846525040862]
> var value = srgb_to_okhsl(0, 255, 0); value[0] *= 360; value
[142.49533888780996, 0.9999999700728788, 0.8445289645307816]
> var value = srgb_to_okhsl(0, 0, 255); value[0] *= 360; value
[264.052020638055, 0.9999999948631134, 0.3665653394260194]

// Okhsv
> var value = srgb_to_okhsv(255, 255, 255); value[0] *= 360; value
[89.87556309590242, 1.0347523928230576e-7, 1.000000027003774]
> var value = srgb_to_okhsv(255, 0, 0); value[0] *= 360; value
[29.23388519234263, 0.9995219692256989, 1.0000000001685625]
> var value = srgb_to_okhsv(0, 255, 0); value[0] *= 360; value
[142.49533888780996, 0.9999997210415695, 0.9999999884428648]
> var value = srgb_to_okhsv(0, 0, 255); value[0] *= 360; value
[264.052020638055, 0.9999910912349018, 0.9999999646150918]
```

And then ours. Ignoring the authors hue and our hue results for white
and the oddly high chroma for the author's achromatic white in Okhsl
(both of which are meaningless in an achromatic color), we can see that
that we match quite well up to ~7 digits.

```
# Okhsl
>>> Color('white').convert('okhsl', norm=False)[:]
[180.0, 0.0, 1.0, 1.0]
>>> Color('#ff0000').convert('okhsl', norm=False)[:]
[29.233880279627876, 1.0000001765854427, 0.5680846563197033, 1.0]
>>> Color('#00ff00').convert('okhsl', norm=False)[:]
[142.4953450414438, 1.0000000000000009, 0.8445289714936317, 1.0]
>>> [264.05202261637004, 1.0000000005848086, 0.36656533918708145, 1.0]
[264.05202261637004, 1.0000000005848086, 0.36656533918708145, 1.0]
# Okhsv
>>> Color('white').convert('okhsv', norm=False)[:]
[180.0, 0.0, 1.0, 1.0]
>>> Color('#ff0000').convert('okhsv', norm=False)[:]
[29.233880279627876, 1.0000004019360378, 0.9999999999999994, 1.0]
>>> Color('#00ff00').convert('okhsv', norm=False)[:]
[142.4953450414438, 0.9999998662471965, 1.0000000000000004, 1.0]
>>> Color('#0000ff').convert('okhsv', norm=False)[:]
[264.05202261637004, 1.000000002300706, 0.9999999999999999, 1.0]
"""
import sys
import os
import struct

sys.path.insert(0, os.getcwd())

# import tools.calc_xyz_transform as xyzt  # noqa: E402
from coloraide import util  # noqa: E402
from coloraide import algebra as alg  # noqa: E402

"""Calculate XYZ conversion matrices."""
import sys
import os

sys.path.insert(0, os.getcwd())

xyzt_white_d65 = util.xy_to_xyz((0.31270, 0.32900))
xyzt_white_d50 = util.xy_to_xyz((0.34570, 0.35850))
xyzt_white_aces = util.xy_to_xyz((0.32168, 0.33767))

def xyzt_get_matrix(wp, space):
    """Get the matrices for the specified space."""

    if space == 'srgb':
        x = [0.64, 0.30, 0.15]
        y = [0.33, 0.60, 0.06]
    elif space == 'display-p3':
        x = [0.68, 0.265, 0.150]
        y = [0.32, 0.69, 0.060]
    elif space == 'rec2020':
        x = [0.708, 0.17, 0.131]
        y = [0.292, 0.797, 0.046]
    elif space == 'a98-rgb':
        x = [0.64, 0.21, 0.15]
        y = [0.33, 0.71, 0.06]
    elif space == 'prophoto-rgb':
        x = [0.7347, 0.1596, 0.0366]
        y = [0.2653, 0.8404, 0.0001]
    elif space == 'aces-ap0':
        x = [0.7347, 0.0, 0.0001]
        y = [0.2653, 1.0, -0.0770]
    elif space == 'aces-ap1':
        x = [0.713, 0.165, 0.128]
        y = [0.293, 0.830, 0.044]
    else:
        raise ValueError

    m = alg.transpose([util.xy_to_xyz(xy) for xy in zip(x, y)])
    rgb = alg.solve(m, wp)
    rgb2xyz = alg.multiply(m, rgb)
    xyz2rgb = alg.inv(rgb2xyz)

    return rgb2xyz, xyz2rgb

float32 = alg.vectorize(lambda value: struct.unpack('f', struct.pack('f', value))[0])

# Calculated using our own `calc_xyz_transform.py`
RGB_TO_XYZ, XYZ_TO_RGB = xyzt_get_matrix(xyzt_white_d65, 'srgb')

# Matrix provided by the author of Oklab to allow for calculating a precise M1 matrix
# using any white point.
M0 = [
    [0.77849780, 0.34399940, -0.12249720],
    [0.03303601, 0.93076195, 0.03620204],
    [0.05092917, 0.27933344, 0.66973739]
]

# Calculate XYZ to LMS and LMS to XYZ using our white point.
XYZ_TO_LMS = alg.divide(M0, alg.outer(alg.matmul(M0, xyzt_white_d65), alg.ones(3)))
XYZD50_TO_LMS = alg.divide(M0, alg.outer(alg.matmul(M0, xyzt_white_d50), alg.ones(3)))

# Calculate the inverse
LMS_TO_XYZ = alg.inv(XYZ_TO_LMS)
LMS_TO_XYZD50 = alg.inv(XYZD50_TO_LMS)

# Calculate linear sRGB to LMS (used for Okhsl and Okhsv)
SRGBL_TO_LMS = alg.matmul(XYZ_TO_LMS, RGB_TO_XYZ)
LMS_TO_SRGBL = alg.inv(SRGBL_TO_LMS)

# Oklab specifies the following matrix as M1 along with the inverse.
# ```
# LMS3_TO_OKLAB = [
#     [0.2104542553, 0.7936177850, -0.0040720468],
#     [1.9779984951, -2.4285922050, 0.4505937099],
#     [0.0259040371, 0.7827717662, -0.8086757660]
# ]
# ```
# But since the matrix is provided in 32 bit, we are not able to get the
# proper inverse for `[1, 0, 0]` in 64 bit, even if we calculate the a
# new 64 bit inverse for the above forward transform. What we need is a
# proper 64 bit forward and reverse transform.
#
# In order to adjust for this, we take documented 32 bit inverse matrix which
# gives us a perfect translation from Oklab `[1, 0, 0]` to LMS of `[1, 1, 1]`
# and parse the matrix as float 32 and emit it as 64 bit and then take the inverse.
OKLAB_TO_LMS3 = float32([
    [1.0, 0.3963377774, 0.2158037573],
    [1.0, -0.1055613458, -0.0638541728],
    [1.0, -0.0894841775, -1.2914855480]
])

# Calculate the inverse
LMS3_TO_OKLAB = alg.inv(OKLAB_TO_LMS3)

