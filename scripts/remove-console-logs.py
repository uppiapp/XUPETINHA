"""
Remove console.log e console.warn de todas as API routes.
Mantém console.error apenas em blocos catch (tratamento de erros reais).
"""

import os
import re

API_DIR = "/vercel/share/v0-project/app/api"

# Padrão para linhas de console.log / console.warn standalone
LOG_PATTERN = re.compile(r'^[ \t]*console\.(log|warn)\(.*\);?\s*$', re.MULTILINE)

# Padrão para console.error com prefixo [v0] (eram debug statements)
V0_ERROR_PATTERN = re.compile(r"^[ \t]*console\.error\(\s*['\"`]\[v0\][^'\"`;]*['\"`].*\);?\s*$", re.MULTILINE)

# Linhas em branco excessivas
BLANK_PATTERN = re.compile(r'\n{3,}')

changed = 0
total = 0

for root, dirs, files in os.walk(API_DIR):
    for fname in files:
        if not fname.endswith('.ts'):
            continue
        fpath = os.path.join(root, fname)
        total += 1
        with open(fpath, 'r', encoding='utf-8') as f:
            original = f.read()
        
        content = LOG_PATTERN.sub('', original)
        content = V0_ERROR_PATTERN.sub('', content)
        content = BLANK_PATTERN.sub('\n\n', content)
        
        if content != original:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            rel = fpath.replace('/vercel/share/v0-project/', '')
            print(f"Cleaned: {rel}")
            changed += 1

print(f"\nDone. {changed} files updated out of {total} scanned.")
