//
//  FirstViewController.m
//  TechPrep
//
//  Created by Shayne Czyzewski on 6/6/11.
//  Copyright 2011 University of Texas at Austin. All rights reserved.
//

#import "FirstViewController.h"
#import "Helpers.h"


@implementation FirstViewController


- (void)awakeFromNib {
	webView.delegate = self;
	NSString* url = @"http://essandesstest.heroku.com";
	[webView loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:url]]];
}


- (BOOL)webView:(UIWebView*)webView shouldStartLoadWithRequest:(NSURLRequest*)request navigationType:(UIWebViewNavigationType)navigationType {
	NSMutableURLRequest* modifiableRequest = (NSMutableURLRequest*) request;
	
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
	
	// Set HTTP method to POST
    //[modifiableRequest setHTTPMethod:@"POST"];
    // Set up the parameters to send
    //NSString* paramDataString = [Helpers getExtraParams];
    //NSLog(@"%s - paramDataString: %@", __FUNCTION__, paramDataString);
    // Encode the parameters to default for NSMutableURLRequest
    //NSData* paramData = [paramDataString dataUsingEncoding:NSUTF8StringEncoding];
    // Set the NSMutableURLRequest body data
    //[modifiableRequest setHTTPBody: paramData];
	
	NSURL* url = request.URL;
	NSLog([newUrl absoluteString]);
	return YES;
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
