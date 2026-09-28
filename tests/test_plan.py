import copy, importlib.util, json, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('plan',ROOT/'scripts/validate_plan.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class PlanTests(unittest.TestCase):
    def setUp(self):
        self.plan=json.loads((ROOT/'examples/plan.json').read_text(encoding='utf8'))
    def test_valid_silent_demo(self):self.assertEqual(module.validate(self.plan),[])
    def test_overlap(self):
        self.plan['shots'][1]['start']=3
        self.assertTrue(module.validate(self.plan))
    def test_zero_duration(self):
        self.plan['shots'][0]['end']=0
        self.assertTrue(module.validate(self.plan))
    def test_overrun(self):
        self.plan['shots'][-1]['end']=13
        self.assertTrue(module.validate(self.plan))
    def test_missing_semantic_result(self):
        del self.plan['shots'][0]['visible_result']
        self.assertTrue(module.validate(self.plan))
    def test_odd_width(self):
        self.plan['width']=1279
        self.assertTrue(module.validate(self.plan))
    def test_nonfinite_time(self):
        self.plan['shots'][0]['start']=float('nan')
        self.assertTrue(module.validate(self.plan))
    def test_silent_cannot_be_listened(self):
        self.plan['listening_verified']=True
        self.assertTrue(module.validate(self.plan))
    def test_instrumental_gap_allowed(self):
        self.plan['shots'][1]['start']=5
        self.assertEqual(module.validate(self.plan),[])

if __name__=='__main__':unittest.main()
