//
//  TechPrepAppDelegate.h
//  TechPrep
//
//  Created by Shayne Czyzewski on 6/6/11.
//  Copyright 2011 University of Texas at Austin. All rights reserved.
//

#import <UIKit/UIKit.h>

@interface TechPrepAppDelegate : NSObject <UIApplicationDelegate, UITabBarControllerDelegate> {
    UIWindow *window;
    UITabBarController *tabBarController;
}

@property (nonatomic, retain) IBOutlet UIWindow *window;
@property (nonatomic, retain) IBOutlet UITabBarController *tabBarController;

@end
