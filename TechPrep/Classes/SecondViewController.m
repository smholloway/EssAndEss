//
//  SecondViewController.m
//  TechPrep
//
//  Created by Shayne Czyzewski on 6/9/11.


#import "SecondViewController.h"
#import "Helpers.h"


@implementation SecondViewController


- (void)awakeFromNib {
	webView.delegate = self;
	NSString* url = @"http://essandesstest.heroku.com/pocketref";
	[webView loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:url]]];
}


- (BOOL)webView:(UIWebView*)webView shouldStartLoadWithRequest:(NSURLRequest*)request navigationType:(UIWebViewNavigationType)navigationType {
	// check if request has already been modified
	NSString* searchForMe = @"&product=";
	NSRange range = [[request.URL absoluteString] rangeOfString:searchForMe];
	bool append = (range.location == NSNotFound);
	
	if (append) {
		// we do not have the params on there so add them...
		NSMutableURLRequest* modifiableRequest = [request mutableCopy];
		NSString* paramDataString = [Helpers getExtraParams];
		NSArray* parameters = [[request.URL query] componentsSeparatedByCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"=&"]];
		NSString* ending = nil;
		if ([parameters count] > 0) {
			ending = [@"&" stringByAppendingString:paramDataString];
		}
		else {
			ending = [@"?" stringByAppendingString:paramDataString];
		}
		
		NSURL* newUrl = [NSURL URLWithString:[[request.URL absoluteString] stringByAppendingString:ending]];
		[modifiableRequest setURL:newUrl];
		
		[webView loadRequest:modifiableRequest];
		return NO; // don't send this request, use modified request above
	}
	else {
		// we already have the params on there so quick fucking with the URL and send it...
		//NSLog([[request	URL] absoluteString]);
		return YES;
	}
}


/*
 // The designated initializer. Override to perform setup that is required before the view is loaded.
 - (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil {
 self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
 if (self) {
 // Custom initialization
 }
 return self;
 }
 */

/*
 // Implement loadView to create a view hierarchy programmatically, without using a nib.
 - (void)loadView {
 [self loadView];
 }
 */

/*
 // Implement viewDidLoad to do additional setup after loading the view, typically from a nib.
 - (void)viewDidLoad {
 [super viewDidLoad];
 }
 */

/*
 // Override to allow orientations other than the default portrait orientation.
 - (BOOL)shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation)interfaceOrientation {
 // Return YES for supported orientations
 return (interfaceOrientation == UIInterfaceOrientationPortrait);
 }
 */

- (void)didReceiveMemoryWarning {
	// Releases the view if it doesn't have a superview.
    [super didReceiveMemoryWarning];
	
	// Release any cached data, images, etc that aren't in use.
}

- (void)viewDidUnload {
	// Release any retained subviews of the main view.
	// e.g. self.myOutlet = nil;
}


- (void)dealloc {
    [super dealloc];
	[webView release];
}

@end
