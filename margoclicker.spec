# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path
from PyInstaller.utils.hooks import collect_submodules

root = Path(__file__).resolve().parent

datas = [
    (str(root / 'margoclicker_settings.json'), '.'),
    (str(root / 'data'), 'data'),
]

hiddenimports = collect_submodules('flask') + ['cv2', 'numpy', 'PIL', 'pytesseract', 'mss', 'imagehash']

block_cipher = None

a = Analysis(
    ['margoclicker.py'],
    pathex=[str(root)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='MargoClicker',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
)
