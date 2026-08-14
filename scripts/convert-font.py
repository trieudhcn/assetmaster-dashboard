from fontTools.ttLib import TTFont

source = "/home/ubuntu/assetmaster-dashboard/node_modules/@fontsource/noto-sans/files/noto-sans-vietnamese-400-normal.woff"
target = "/home/ubuntu/assetmaster-dashboard/client/src/assets/noto-sans-vietnamese.ttf"
font = TTFont(source)
font.flavor = None
font.save(target)
print(target)
