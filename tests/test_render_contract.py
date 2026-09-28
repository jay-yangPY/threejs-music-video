import argparse,importlib.util,math,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location('render_tool',ROOT/'scripts/render.py');r=importlib.util.module_from_spec(s);s.loader.exec_module(r)
class Page:
    def __init__(self,spec):self.spec=spec
    def evaluate(self,_):return self.spec
class RenderTests(unittest.TestCase):
    def test_loopback(self):self.assertEqual(r.local_url('http://127.0.0.1:9999'),'http://127.0.0.1:9999')
    def test_remote_refused(self):
        with self.assertRaises(argparse.ArgumentTypeError):r.local_url('https://example.com')
    def test_embedded_credentials_refused(self):
        with self.assertRaises(argparse.ArgumentTypeError):r.local_url('http://user:pass@localhost:8879')
    def test_bad_spec(self):
        with self.assertRaises(ValueError):r.get_spec(Page({'width':1281,'height':720,'fps':30,'duration':12}))
    def test_nan_duration(self):
        with self.assertRaises(ValueError):r.get_spec(Page({'width':1280,'height':720,'fps':30,'duration':float('nan')}))
    def test_good_spec(self):self.assertEqual(r.get_spec(Page({'width':1280,'height':720,'fps':30,'duration':12}))['duration'],12)
if __name__=='__main__':unittest.main()
